/**
 * Windows XP Desktop Experience for Efraín Cortez CV
 * Complete Window Manager, Start Menu, Audio and Taskbar Controls
 */

document.addEventListener('DOMContentLoaded', () => {
  // Audio state
  let isSoundEnabled = true;
  let audioUnlocked = false;

  // Sound effects loader
  const sounds = {
    startup: new Audio('assets/sounds/startup.wav'),
    error: new Audio('assets/sounds/error.wav'),
    ding: new Audio('assets/sounds/ding.wav'),
    balloon: new Audio('assets/sounds/balloon.wav'),
    notify: new Audio('assets/sounds/notify.wav'),
    minimize: new Audio('assets/sounds/minimize.wav'),
    restore: new Audio('assets/sounds/restore.wav'),
    recycle: new Audio('assets/sounds/recycle.wav')
  };

  function playSound(name) {
    if (!isSoundEnabled || !sounds[name]) return;
    try {
      sounds[name].currentTime = 0;
      sounds[name].play().catch(() => {});
    } catch (e) {}
  }

  // Unlock audio on first user gesture
  function unlockAudio() {
    if (!audioUnlocked) {
      audioUnlocked = true;
      playSound('startup');
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    }
  }
  document.addEventListener('click', unlockAudio, { once: true });
  document.addEventListener('keydown', unlockAudio, { once: true });

  // Sound tray toggle
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      isSoundEnabled = !isSoundEnabled;
      soundToggleBtn.title = isSoundEnabled ? 'Sonido: Activado' : 'Sonido: Silenciado';
      soundToggleBtn.style.opacity = isSoundEnabled ? '1' : '0.5';
      if (isSoundEnabled) playSound('ding');
    });
  }

  // Live Clock
  const clockEl = document.getElementById('tray-clock');
  function updateClock() {
    if (!clockEl) return;
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    clockEl.textContent = `${hours}:${minutes} ${ampm}`;

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    clockEl.title = now.toLocaleDateString('es-ES', options);
  }
  updateClock();
  setInterval(updateClock, 1000);

  // Window Manager System
  let highestZ = 100;
  const windows = {};
  const taskbarTasks = document.getElementById('taskbar-tasks');

  // Register all windows
  document.querySelectorAll('.xp-window').forEach(win => {
    const id = win.id;
    windows[id] = {
      el: win,
      title: win.dataset.title || 'Ventana',
      icon: win.dataset.icon || 'assets/icons/document.png',
      isMinimized: false,
      isMaximized: false,
      prevRect: null
    };

    // Add statusbar resize grip for touch and mouse resizing
    const statusbar = win.querySelector('.xp-statusbar');
    if (statusbar && !statusbar.querySelector('.xp-resize-grip')) {
      const grip = document.createElement('div');
      grip.className = 'xp-resize-grip';
      grip.title = 'Arrastrar para cambiar tamaño';
      statusbar.appendChild(grip);
      initResizeGrip(grip, win);
    }

    // Bring to front on click / touch
    win.addEventListener('mousedown', () => bringToFront(id));
    win.addEventListener('touchstart', () => bringToFront(id), { passive: true });
  });

  // Corner resize grip logic
  function initResizeGrip(grip, winEl) {
    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    function startResize(clientX, clientY) {
      if (winEl.classList.contains('maximized') || winEl.isMaximized) {
        winEl.classList.remove('maximized');
        winEl.isMaximized = false;
      }
      isResizing = true;
      startX = clientX;
      startY = clientY;
      const rect = winEl.getBoundingClientRect();
      startWidth = rect.width;
      startHeight = rect.height;
      bringToFront(winEl.id);
    }

    function doResize(clientX, clientY) {
      if (!isResizing) return;
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

      const minW = 260;
      const minH = 200;
      const maxW = window.innerWidth - 8;
      const maxH = window.innerHeight - 34;

      const newWidth = Math.max(minW, Math.min(maxW, startWidth + deltaX));
      const newHeight = Math.max(minH, Math.min(maxH, startHeight + deltaY));

      winEl.style.width = `${newWidth}px`;
      winEl.style.height = `${newHeight}px`;
    }

    function stopResize() {
      isResizing = false;
    }

    // Mouse resize
    grip.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      startResize(e.clientX, e.clientY);

      function onMouseMove(moveEvent) {
        doResize(moveEvent.clientX, moveEvent.clientY);
      }
      function onMouseUp() {
        stopResize();
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // Touch resize for mobile / tablet
    grip.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      if (e.touches.length === 1) {
        startResize(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    grip.addEventListener('touchmove', (e) => {
      if (!isResizing || e.touches.length !== 1) return;
      if (e.cancelable) e.preventDefault();
      const t = e.touches[0];
      doResize(t.clientX, t.clientY);
    }, { passive: false });

    grip.addEventListener('touchend', stopResize);
    grip.addEventListener('touchcancel', stopResize);
  }

  function bringToFront(id) {
    highestZ += 2;
    const win = windows[id];
    if (!win) return;

    document.querySelectorAll('.xp-window').forEach(w => {
      w.classList.remove('active');
      w.classList.add('inactive');
    });

    win.el.style.zIndex = highestZ;
    win.el.classList.remove('inactive');
    win.el.classList.add('active');

    // Update taskbar active state
    document.querySelectorAll('.taskbar-item').forEach(btn => btn.classList.remove('active'));
    const taskBtn = document.getElementById(`task-${id}`);
    if (taskBtn) taskBtn.classList.add('active');
  }

  window.openWindow = function(id) {
    const win = windows[id];
    if (!win) return;

    if (win.el.style.display !== 'flex') {
      win.el.style.display = 'flex';
      playSound('restore');

      const isMobile = window.innerWidth <= 768;

      if (isMobile) {
        // Mobile phone positioning: centered with balanced margins
        const mobileW = Math.min(336, window.innerWidth - 20);
        const mobileH = Math.min(480, window.innerHeight - 46);
        const mobileLeft = Math.max(10, Math.floor((window.innerWidth - mobileW) / 2));
        win.el.style.left = `${mobileLeft}px`;
        win.el.style.top = '8px';
        win.el.style.width = `${mobileW}px`;
        win.el.style.height = `${mobileH}px`;
        win.isMaximized = false;
      } else {
        // Desktop positioning
        if (!win.el.style.top || win.el.style.top === '') {
          const desktopWidth = window.innerWidth;
          const desktopHeight = window.innerHeight - 30;
          const width = Math.min(win.el.offsetWidth || 560, desktopWidth * 0.9);
          const height = Math.min(win.el.offsetHeight || 440, desktopHeight * 0.85);

          const left = Math.max(20, (desktopWidth - width) / 2 + (Object.keys(windows).indexOf(id) * 20));
          const top = Math.max(20, (desktopHeight - height) / 2 + (Object.keys(windows).indexOf(id) * 15));

          win.el.style.left = `${left}px`;
          win.el.style.top = `${top}px`;
          win.el.style.width = `${width}px`;
          win.el.style.height = `${height}px`;
        }
      }

      addTaskbarItem(id);
    } else if (win.isMinimized) {
      win.el.style.display = 'flex';
      win.isMinimized = false;
      playSound('restore');
    }

    bringToFront(id);
  };

  window.closeWindow = function(id) {
    const win = windows[id];
    if (!win) return;
    win.el.style.display = 'none';
    win.isMinimized = false;
    removeTaskbarItem(id);
    playSound('ding');
  };

  window.minimizeWindow = function(id) {
    const win = windows[id];
    if (!win) return;
    win.el.style.display = 'none';
    win.isMinimized = true;
    playSound('minimize');

    const taskBtn = document.getElementById(`task-${id}`);
    if (taskBtn) taskBtn.classList.remove('active');
  };

  window.maximizeWindow = function(id) {
    const win = windows[id];
    if (!win) return;

    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      const currentHeight = win.el.offsetHeight;
      const isCurrentlyLarge = currentHeight > (window.innerHeight * 0.55);

      if (isCurrentlyLarge) {
        // Toggle to Compact Mode (hacerla más pequeña)
        win.el.classList.remove('maximized');
        win.isMaximized = false;
        const compactW = Math.min(315, window.innerWidth - 24);
        const compactH = Math.min(290, Math.floor(window.innerHeight * 0.45));
        const compactLeft = Math.max(12, Math.floor((window.innerWidth - compactW) / 2));
        win.el.style.width = `${compactW}px`;
        win.el.style.height = `${compactH}px`;
        win.el.style.left = `${compactLeft}px`;
        win.el.style.top = '30px';
      } else {
        // Toggle to Fullscreen Mode
        win.el.classList.add('maximized');
        win.isMaximized = true;
        win.el.style.left = '6px';
        win.el.style.top = '6px';
        win.el.style.width = `${window.innerWidth - 12}px`;
        win.el.style.height = `${window.innerHeight - 42}px`;
      }
      playSound('restore');
      return;
    }

    if (win.isMaximized) {
      // Restore previous size on desktop
      win.el.classList.remove('maximized');
      win.isMaximized = false;
      if (win.prevRect) {
        win.el.style.top = win.prevRect.top;
        win.el.style.left = win.prevRect.left;
        win.el.style.width = win.prevRect.width;
        win.el.style.height = win.prevRect.height;
      }
    } else {
      // Maximize desktop
      win.prevRect = {
        top: win.el.style.top,
        left: win.el.style.left,
        width: win.el.style.width,
        height: win.el.style.height
      };
      win.el.classList.add('maximized');
      win.isMaximized = true;
    }
    playSound('restore');
  };

  // Taskbar button handling
  function addTaskbarItem(id) {
    if (document.getElementById(`task-${id}`)) return;
    const win = windows[id];

    const btn = document.createElement('div');
    btn.className = 'taskbar-item active';
    btn.id = `task-${id}`;
    btn.innerHTML = `<img src="${win.icon}" alt=""><span>${win.title}</span>`;

    btn.addEventListener('click', () => {
      if (win.isMinimized) {
        win.el.style.display = 'flex';
        win.isMinimized = false;
        bringToFront(id);
        playSound('restore');
      } else if (win.el.classList.contains('active')) {
        minimizeWindow(id);
      } else {
        bringToFront(id);
      }
    });

    taskbarTasks.appendChild(btn);
  }

  function removeTaskbarItem(id) {
    const btn = document.getElementById(`task-${id}`);
    if (btn) btn.remove();
  }

  // Draggable Titlebars
  document.querySelectorAll('.xp-titlebar').forEach(titlebar => {
    const winEl = titlebar.closest('.xp-window');
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    function startDrag(clientX, clientY) {
      // If maximized, unmaximize so dragging works smoothly
      if (winEl.classList.contains('maximized') || winEl.isMaximized) {
        winEl.classList.remove('maximized');
        winEl.isMaximized = false;
        if (window.innerWidth <= 768) {
          const compactW = Math.min(340, window.innerWidth - 16);
          const compactH = Math.min(380, Math.floor(window.innerHeight * 0.6));
          winEl.style.width = `${compactW}px`;
          winEl.style.height = `${compactH}px`;
        }
      }

      isDragging = true;
      startX = clientX;
      startY = clientY;

      const rect = winEl.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      bringToFront(winEl.id);
    }

    function doDrag(clientX, clientY) {
      if (!isDragging) return;
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

      let newLeft = initialLeft + deltaX;
      let newTop = initialTop + deltaY;

      // Desktop bounds
      newTop = Math.max(0, Math.min(window.innerHeight - 50, newTop));
      newLeft = Math.max(-winEl.offsetWidth + 60, Math.min(window.innerWidth - 60, newLeft));

      winEl.style.left = `${newLeft}px`;
      winEl.style.top = `${newTop}px`;
    }

    function stopDrag() {
      isDragging = false;
    }

    // Mouse drag
    titlebar.addEventListener('mousedown', (e) => {
      if (e.target.closest('.xp-control-btn')) return;
      startDrag(e.clientX, e.clientY);

      function onMouseMove(moveEvent) {
        doDrag(moveEvent.clientX, moveEvent.clientY);
      }
      function onMouseUp() {
        stopDrag();
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // Touch support for dragging on phones and tablets
    titlebar.addEventListener('touchstart', (e) => {
      if (e.target.closest('.xp-control-btn')) return;
      if (e.touches.length === 1) {
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    titlebar.addEventListener('touchmove', (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      if (e.cancelable) e.preventDefault();
      const t = e.touches[0];
      doDrag(t.clientX, t.clientY);
    }, { passive: false });

    titlebar.addEventListener('touchend', stopDrag);
    titlebar.addEventListener('touchcancel', stopDrag);
  });

  // Desktop Icons Selection & Double Click
  const icons = document.querySelectorAll('.desktop-icon');
  let lastClickTime = 0;
  let lastClickedIcon = null;

  icons.forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      icons.forEach(i => i.classList.remove('selected'));
      icon.classList.add('selected');

      // Double click / Mobile tap detection
      const now = Date.now();
      const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window);
      const isQuickDoubleTap = (lastClickedIcon === icon && (now - lastClickTime) < 600);
      const isMobileSecondTap = isMobile && lastClickedIcon === icon;

      if (isQuickDoubleTap || isMobileSecondTap) {
        handleIconAction(icon);
        lastClickTime = 0;
        lastClickedIcon = null;
      } else {
        lastClickTime = now;
        lastClickedIcon = icon;
      }
    });

    icon.addEventListener('dblclick', () => {
      handleIconAction(icon);
    });
  });

  function handleIconAction(icon) {
    const action = icon.dataset.action;
    const target = icon.dataset.target;

    if (action === 'open-window' && target) {
      openWindow(target);
    } else if (action === 'link' && target) {
      playSound('ding');
      window.open(target, '_blank');
    } else if (action === 'recycle') {
      openWindow('win-recycle');
    }
  }

  // Click on desktop to deselect icons and close menus
  const desktop = document.getElementById('desktop');
  desktop.addEventListener('click', (e) => {
    if (e.target === desktop || e.target.classList.contains('desktop-icons')) {
      icons.forEach(i => i.classList.remove('selected'));
      closeStartMenu();
      hideContextMenu();
    }
  });

  // Desktop Selection Marquee Drag
  const marquee = document.getElementById('selection-marquee');
  let isSelecting = false;
  let selectStartX, selectStartY;

  desktop.addEventListener('mousedown', (e) => {
    if (e.target !== desktop && !e.target.classList.contains('desktop-icons')) return;
    if (e.button !== 0) return; // Only left button

    isSelecting = true;
    selectStartX = e.clientX;
    selectStartY = e.clientY;

    marquee.style.left = `${selectStartX}px`;
    marquee.style.top = `${selectStartY}px`;
    marquee.style.width = '0px';
    marquee.style.height = '0px';
    marquee.style.display = 'block';

    function onMarqueeMove(moveEvent) {
      if (!isSelecting) return;
      const currentX = moveEvent.clientX;
      const currentY = moveEvent.clientY;

      const left = Math.min(selectStartX, currentX);
      const top = Math.min(selectStartY, currentY);
      const width = Math.abs(currentX - selectStartX);
      const height = Math.abs(currentY - selectStartY);

      marquee.style.left = `${left}px`;
      marquee.style.top = `${top}px`;
      marquee.style.width = `${width}px`;
      marquee.style.height = `${height}px`;

      // Select icons that intersect
      const marqueeRect = marquee.getBoundingClientRect();
      icons.forEach(icon => {
        const iconRect = icon.getBoundingClientRect();
        const intersects = !(marqueeRect.right < iconRect.left || 
                             marqueeRect.left > iconRect.right || 
                             marqueeRect.bottom < iconRect.top || 
                             marqueeRect.top > iconRect.bottom);
        if (intersects) {
          icon.classList.add('selected');
        } else {
          icon.classList.remove('selected');
        }
      });
    }

    function onMarqueeUp() {
      isSelecting = false;
      marquee.style.display = 'none';
      document.removeEventListener('mousemove', onMarqueeMove);
      document.removeEventListener('mouseup', onMarqueeUp);
    }

    document.addEventListener('mousemove', onMarqueeMove);
    document.addEventListener('mouseup', onMarqueeUp);
  });

  // Start Menu Toggle
  const startBtn = document.getElementById('start-btn');
  const startMenu = document.getElementById('start-menu');

  function toggleStartMenu() {
    const isOpen = startMenu.classList.contains('open');
    if (isOpen) {
      closeStartMenu();
    } else {
      openStartMenu();
    }
  }

  function openStartMenu() {
    startMenu.classList.add('open');
    startBtn.classList.add('active');
    playSound('ding');
  }

  function closeStartMenu() {
    startMenu.classList.remove('open');
    startBtn.classList.remove('active');
  }

  startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleStartMenu();
  });

  // Start menu items click handler
  document.querySelectorAll('.start-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const action = item.dataset.action;
      const target = item.dataset.target;

      closeStartMenu();

      if (action === 'open-window' && target) {
        openWindow(target);
      } else if (action === 'link' && target) {
        playSound('ding');
        window.open(target, '_blank');
      }
    });
  });

  // Quick Launch Show Desktop
  const showDesktopBtn = document.getElementById('btn-show-desktop');
  if (showDesktopBtn) {
    showDesktopBtn.addEventListener('click', () => {
      let anyVisible = false;
      Object.keys(windows).forEach(id => {
        if (windows[id].el.style.display !== 'none' && !windows[id].isMinimized) {
          anyVisible = true;
          minimizeWindow(id);
        }
      });

      if (!anyVisible) {
        Object.keys(windows).forEach(id => {
          if (windows[id].isMinimized) {
            windows[id].el.style.display = 'flex';
            windows[id].isMinimized = false;
            bringToFront(id);
          }
        });
        playSound('restore');
      }
    });
  }

  // XP Tab Switching System
  document.querySelectorAll('.xp-tabs-header').forEach(header => {
    const buttons = header.querySelectorAll('.xp-tab-btn');
    const container = header.nextElementSibling;
    if (!container) return;

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.tab;
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        container.querySelectorAll('.tab-pane').forEach(pane => {
          pane.classList.remove('active');
        });
        const activePane = container.querySelector(`#${targetId}`);
        if (activePane) activePane.classList.add('active');

        playSound('ding');
      });
    });
  });

  // Balloon Tip
  const balloonTip = document.getElementById('welcome-balloon');
  const balloonClose = document.getElementById('balloon-close');
  if (balloonTip && balloonClose) {
    balloonClose.addEventListener('click', () => {
      balloonTip.style.display = 'none';
    });
    // Auto play balloon chime on load
    setTimeout(() => {
      if (isSoundEnabled) playSound('balloon');
    }, 1500);
    // Auto dismiss after 15s
    setTimeout(() => {
      if (balloonTip) balloonTip.style.display = 'none';
    }, 15000);
  }

  // Right Click Context Menu
  const contextMenu = document.getElementById('xp-context-menu');
  desktop.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!contextMenu) return;

    let x = e.clientX;
    let y = e.clientY;
    if (x + 160 > window.innerWidth) x = window.innerWidth - 170;
    if (y + 180 > window.innerHeight) y = window.innerHeight - 190;

    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    contextMenu.style.display = 'block';
  });

  function hideContextMenu() {
    if (contextMenu) contextMenu.style.display = 'none';
  }

  document.addEventListener('click', hideContextMenu);

  document.querySelectorAll('.context-item').forEach(item => {
    item.addEventListener('click', () => {
      const act = item.dataset.action;
      if (act === 'refresh') {
        playSound('ding');
        location.reload();
      } else if (act === 'about') {
        openWindow('win-about');
      } else if (act === 'skills') {
        openWindow('win-skills');
      } else if (act === 'drive-cv') {
        window.open('https://drive.google.com/file/d/14z8-fCVt2aD1nbwbrG-eAYZ2CMYy4hVZ/view', '_blank');
      }
      hideContextMenu();
    });
  });

  // Empty Recycle Bin Easter Egg
  const emptyRecycleBtn = document.getElementById('empty-recycle-btn');
  if (emptyRecycleBtn) {
    emptyRecycleBtn.addEventListener('click', () => {
      playSound('recycle');
      const list = document.getElementById('recycle-files-list');
      if (list) {
        list.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">La papelera de reciclaje está vacía. ¡Todos los bugs han sido resueltos!</div>';
      }
      // Update recycle desktop icon
      const recycleIcon = document.getElementById('desktop-recycle-icon');
      if (recycleIcon) {
        recycleIcon.src = 'assets/icons/recycle_empty.png';
      }
    });
  }

  // Shutdown Modal Dialog
  const shutdownModal = document.getElementById('shutdown-modal');
  const shutdownTriggers = document.querySelectorAll('.trigger-shutdown');
  const shutdownCancelBtn = document.getElementById('shutdown-cancel-btn');

  shutdownTriggers.forEach(t => {
    t.addEventListener('click', () => {
      closeStartMenu();
      if (shutdownModal) {
        shutdownModal.style.display = 'flex';
        playSound('ding');
      }
    });
  });

  if (shutdownCancelBtn) {
    shutdownCancelBtn.addEventListener('click', () => {
      if (shutdownModal) shutdownModal.style.display = 'none';
    });
  }

  document.querySelectorAll('.shutdown-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      if (shutdownModal) shutdownModal.style.display = 'none';

      if (type === 'turnoff') {
        document.body.innerHTML = `
          <div style="background:#000; width:100vw; height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#ff8000; font-family: Tahoma, sans-serif;">
            <h1 style="font-size:24px; margin-bottom:12px;">Ahora puede apagar el equipo con seguridad.</h1>
            <p style="color:#aaa; margin-bottom:20px;">Portafolio de Efraín Cortez Claros</p>
            <button onclick="location.reload()" style="background:#245edb; color:#fff; border:1px solid #fff; padding:6px 16px; border-radius:3px; cursor:pointer;">Reiniciar Sesión</button>
          </div>
        `;
      } else if (type === 'restart') {
        location.reload();
      } else if (type === 'standby') {
        document.body.style.filter = 'brightness(30%)';
        setTimeout(() => {
          document.body.style.filter = 'none';
        }, 3000);
      }
    });
  });

  // Check URL hash on load
  setTimeout(() => {
    const hash = window.location.hash.toLowerCase();
    if (hash === '#start' || hash === '#inicio') {
      openStartMenu();
    } else if (hash === '#skills' || hash === '#habilidades') {
      openWindow('win-skills');
    } else if (hash === '#experience' || hash === '#experiencia') {
      openWindow('win-experience');
    } else if (hash === '#contact' || hash === '#contacto' || hash === '#whatsapp') {
      openWindow('win-msn');
    } else if (hash === '#drive' || hash === '#cv') {
      openWindow('win-drive');
    } else if (hash === '#education' || hash === '#certificados') {
      openWindow('win-education');
    } else if (hash === '#notepad' || hash === '#resumen') {
      openWindow('win-notepad');
    } else if (hash === '#pos' || hash === '#qa-pos') {
      openWindow('win-qa-pos');
    } else if (hash === '#xray' || hash === '#qa-xray') {
      openWindow('win-qa-xray');
    } else if (window.innerWidth > 768) {
      openWindow('win-about');
    }
  }, 400);
});
