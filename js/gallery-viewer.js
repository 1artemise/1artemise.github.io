class GalleryViewer {
  constructor() {
    this.currentIndex = 0;
    this.images = [];
    this.viewer = null;
    this.init();
  }

  init() {
    this.createViewer();
    this.bindEvents();
    this.loadImages();
  }

  createViewer() {
    this.viewer = document.querySelector('.gallery-viewer');
    if (!this.viewer) {
      console.warn('Gallery viewer element not found');
      return;
    }
  }

  loadImages() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    this.images = Array.from(galleryItems).map((item, index) => {
      const img = item.querySelector('img');
      return {
        src: img.src,
        alt: img.alt,
        index: index
      };
    });
  }

  bindEvents() {
    // 绑定图片点击事件
    document.addEventListener('click', (e) => {
      const viewBtn = e.target.closest('.gallery-view-btn');
      if (viewBtn) {
        e.preventDefault();
        const galleryItem = viewBtn.closest('.gallery-item');
        const index = parseInt(galleryItem.dataset.index);
        this.openViewer(index);
      }

      // 下载按钮
      const downloadBtn = e.target.closest('.gallery-download-btn');
      if (downloadBtn) {
        e.preventDefault();
        const imageSrc = downloadBtn.dataset.image;
        this.downloadImage(imageSrc);
      }
    });

    if (!this.viewer) return;

    // 关闭查看器
    const closeBtn = this.viewer.querySelector('.gallery-viewer-close');
    const overlay = this.viewer.querySelector('.gallery-viewer-overlay');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeViewer());
    }
    
    if (overlay) {
      overlay.addEventListener('click', () => this.closeViewer());
    }

    // 导航按钮
    const prevBtn = this.viewer.querySelector('.gallery-viewer-prev');
    const nextBtn = this.viewer.querySelector('.gallery-viewer-next');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.showPrevious());
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.showNext());
    }

    // 键盘导航
    document.addEventListener('keydown', (e) => {
      if (!this.viewer.classList.contains('active')) return;
      
      switch (e.key) {
        case 'Escape':
          this.closeViewer();
          break;
        case 'ArrowLeft':
          this.showPrevious();
          break;
        case 'ArrowRight':
          this.showNext();
          break;
      }
    });

    // 阻止查看器内容区域的点击事件冒泡
    const viewerContent = this.viewer.querySelector('.gallery-viewer-content');
    if (viewerContent) {
      viewerContent.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }

  openViewer(index) {
    if (!this.viewer || !this.images.length) return;
    
    this.currentIndex = index;
    this.updateViewer();
    this.createThumbnails();
    
    this.viewer.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeViewer() {
    if (!this.viewer) return;
    
    this.viewer.classList.remove('active');
    document.body.style.overflow = '';
  }

  showPrevious() {
    if (this.images.length === 0) return;
    
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.updateViewer();
  }

  showNext() {
    if (this.images.length === 0) return;
    
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.updateViewer();
  }

  updateViewer() {
    if (!this.viewer || !this.images[this.currentIndex]) return;
    
    const image = this.images[this.currentIndex];
    const viewerImage = this.viewer.querySelector('.gallery-viewer-image');
    const viewerTitle = this.viewer.querySelector('.gallery-viewer-title');
    
    if (viewerImage) {
      viewerImage.src = image.src;
      viewerImage.alt = image.alt;
    }
    
    if (viewerTitle) {
      viewerTitle.textContent = `${this.currentIndex + 1} / ${this.images.length}`;
    }

    // 更新缩略图激活状态
    this.updateThumbnailsActive();
  }

  createThumbnails() {
    const container = this.viewer.querySelector('.gallery-thumbnails-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    this.images.forEach((image, index) => {
      const thumbnail = document.createElement('div');
      thumbnail.className = 'thumbnail-item';
      if (index === this.currentIndex) {
        thumbnail.classList.add('active');
      }
      
      thumbnail.innerHTML = `<img src="${image.src}" alt="${image.alt}">`;
      
      thumbnail.addEventListener('click', () => {
        this.currentIndex = index;
        this.updateViewer();
      });
      
      container.appendChild(thumbnail);
    });
  }

  updateThumbnailsActive() {
    const thumbnails = this.viewer.querySelectorAll('.thumbnail-item');
    thumbnails.forEach((thumb, index) => {
      thumb.classList.toggle('active', index === this.currentIndex);
    });
    
    // 滚动到当前缩略图
    const activeThumbnail = this.viewer.querySelector('.thumbnail-item.active');
    if (activeThumbnail) {
      activeThumbnail.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }

  downloadImage(imageSrc) {
    // 创建一个临时链接来下载图片
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = imageSrc.split('/').pop() || 'image';
    
    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 显示下载提示
    this.showMessage('图片下载已开始...', 'success');
  }

  showMessage(message, type = 'info') {
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
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.gallery-display-container')) {
    new GalleryViewer();
  }
});