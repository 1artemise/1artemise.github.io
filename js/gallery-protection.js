/**
 * Gallery Protection System
 * 相册问答保护系统
 */
class GalleryProtection {
  constructor() {
    this.config = null;
    this.init();
  }

  async init() {
    try {
      // 加载配置文件
      const response = await fetch('/data/gallery-config.json');
      this.config = await response.json();
      
      // 渲染分类
      this.renderCategories();
      
      // 绑定事件
      this.bindEvents();
    } catch (error) {
      console.error('Failed to load gallery config:', error);
    }
  }

  renderCategories() {
    const grid = document.querySelector('.gallery-categories-grid');
    if (!grid || !this.config) return;

    grid.innerHTML = '';
    
    Object.entries(this.config.categories).forEach(([categoryId, category]) => {
      const categoryElement = this.createCategoryElement(categoryId, category);
      grid.appendChild(categoryElement);
    });
  }

  createCategoryElement(categoryId, category) {
    const div = document.createElement('div');
    div.className = 'gallery-category';
    div.dataset.category = categoryId;
    div.dataset.protected = category.protected ? 'true' : 'false';

    const previewImage = category.images && category.images.length > 0 
      ? `<img src="${category.images[0]}" alt="${category.name}" loading="lazy">`
      : `<div class="gallery-category-placeholder"><i class="${category.icon || 'fas fa-image'}"></i></div>`;

    const protectedBadge = category.protected 
      ? '<div class="gallery-category-protected"><i class="fas fa-lock"></i><span>需要验证</span></div>'
      : '';

    div.innerHTML = `
      <div class="gallery-category-preview">
        ${previewImage}
      </div>
      <div class="gallery-category-overlay">
        <div class="gallery-category-info">
          <h3 class="gallery-category-name">${category.name}</h3>
          <p class="gallery-category-description">${category.description}</p>
          ${protectedBadge}
          <div class="gallery-category-count">${category.images ? category.images.length : 0} 张照片</div>
        </div>
      </div>
    `;

    return div;
  }

  bindEvents() {
    document.addEventListener('click', (e) => {
      const categoryElement = e.target.closest('.gallery-category');
      if (categoryElement) {
        const categoryId = categoryElement.dataset.category;
        const isProtected = categoryElement.dataset.protected === 'true';
        
        if (isProtected) {
          this.showProtectionDialog(categoryId);
        } else {
          this.openGallery(categoryId);
        }
      }
    });
  }

  showProtectionDialog(categoryId) {
    const category = this.config.categories[categoryId];
    if (!category || !category.questions) return;

    // 检查是否已经通过验证
    const accessKey = `gallery_access_${categoryId}`;
    if (localStorage.getItem(accessKey) === 'granted') {
      this.openGallery(categoryId);
      return;
    }

    // 检查尝试次数
    const attemptsKey = `gallery_attempts_${categoryId}`;
    const attempts = parseInt(localStorage.getItem(attemptsKey) || '0');
    
    if (attempts >= category.maxAttempts) {
      this.showMessage('访问被禁止：错误次数过多，请稍后再试。', 'error');
      return;
    }

    this.currentCategoryId = categoryId;
    this.currentQuestionIndex = 0;
    this.showQuestionDialog(category.questions[0]);
  }

  showQuestionDialog(question) {
    // 移除现有对话框
    const existingDialog = document.querySelector('.gallery-protection-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }

    const dialog = document.createElement('div');
    dialog.className = 'gallery-protection-dialog';
    dialog.innerHTML = `
      <div class="gallery-protection-overlay"></div>
      <div class="gallery-protection-modal">
        <div class="gallery-protection-header">
          <h3>访问验证</h3>
          <button class="gallery-protection-close">&times;</button>
        </div>
        <div class="gallery-protection-body">
          <p class="gallery-protection-question">${question.question}</p>
          <input type="text" class="gallery-protection-input" placeholder="请输入答案">
          <div class="gallery-protection-info"></div>
        </div>
        <div class="gallery-protection-footer">
          <button class="gallery-protection-submit">提交答案</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);
    
    // 显示动画
    setTimeout(() => dialog.classList.add('show'), 10);
    
    // 聚焦输入框
    const input = dialog.querySelector('.gallery-protection-input');
    input.focus();

    // 绑定事件
    this.bindDialogEvents(dialog, question);
  }

  bindDialogEvents(dialog, question) {
    const closeBtn = dialog.querySelector('.gallery-protection-close');
    const submitBtn = dialog.querySelector('.gallery-protection-submit');
    const input = dialog.querySelector('.gallery-protection-input');
    const overlay = dialog.querySelector('.gallery-protection-overlay');

    const closeDialog = () => {
      dialog.classList.remove('show');
      setTimeout(() => dialog.remove(), 300);
    };

    closeBtn.addEventListener('click', closeDialog);
    overlay.addEventListener('click', closeDialog);
    
    submitBtn.addEventListener('click', () => this.checkAnswer(dialog, question));
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.checkAnswer(dialog, question);
      }
    });
  }

  checkAnswer(dialog, question) {
    const input = dialog.querySelector('.gallery-protection-input');
    const info = dialog.querySelector('.gallery-protection-info');
    const userAnswer = input.value.trim();

    if (!userAnswer) {
      this.showDialogMessage(info, '请输入答案', 'error');
      return;
    }

    const isCorrect = question.caseSensitive 
      ? userAnswer === question.answer
      : userAnswer.toLowerCase() === question.answer.toLowerCase();

    if (isCorrect) {
      const category = this.config.categories[this.currentCategoryId];
      this.currentQuestionIndex++;

      if (this.currentQuestionIndex >= category.questions.length) {
        // 所有问题都回答正确
        localStorage.setItem(`gallery_access_${this.currentCategoryId}`, 'granted');
        localStorage.removeItem(`gallery_attempts_${this.currentCategoryId}`);
        
        dialog.classList.remove('show');
        setTimeout(() => {
          dialog.remove();
          this.openGallery(this.currentCategoryId);
        }, 300);
      } else {
        // 继续下一个问题
        dialog.remove();
        this.showQuestionDialog(category.questions[this.currentQuestionIndex]);
      }
    } else {
      // 答案错误
      const attemptsKey = `gallery_attempts_${this.currentCategoryId}`;
      const attempts = parseInt(localStorage.getItem(attemptsKey) || '0') + 1;
      localStorage.setItem(attemptsKey, attempts.toString());

      const category = this.config.categories[this.currentCategoryId];
      const remainingAttempts = category.maxAttempts - attempts;

      if (remainingAttempts <= 0) {
        this.showDialogMessage(info, '答案错误！已达到最大尝试次数，访问被禁止。', 'error');
        setTimeout(() => {
          dialog.classList.remove('show');
          setTimeout(() => dialog.remove(), 300);
        }, 2000);
      } else {
        this.showDialogMessage(info, `答案错误！还有 ${remainingAttempts} 次机会`, 'error');
        input.value = '';
        input.focus();
      }
    }
  }

  showDialogMessage(element, message, type) {
    element.textContent = message;
    element.className = `gallery-protection-info gallery-protection-${type}`;
    
    setTimeout(() => {
      element.textContent = '';
      element.className = 'gallery-protection-info';
    }, 3000);
  }

  showMessage(message, type = 'info') {
    // 创建消息提示
    const messageEl = document.createElement('div');
    messageEl.className = `gallery-message gallery-message--${type}`;
    messageEl.textContent = message;
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => messageEl.classList.add('show'), 10);
    
    setTimeout(() => {
      messageEl.classList.remove('show');
      setTimeout(() => messageEl.remove(), 300);
    }, 3000);
  }

  openGallery(categoryId) {
    const category = this.config.categories[categoryId];
    this.showMessage(`正在打开 ${category.name} 相册...`, 'success');
    
    // 延迟跳转，让用户看到成功消息
    setTimeout(() => {
      window.location.href = `/gallery/${categoryId}/`;
    }, 1000);
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.gallery-categories-container')) {
    new GalleryProtection();
  }
});