// boot
resize();
Terrain.init();
bindPointer(canvas);
bindTouchButtons();
Chat.init(); Full.init();
if (window.matchMedia && matchMedia('(pointer: coarse)').matches) UI.showTouch(true);
MapImage.init(() => { if (settings.map === 'Custom' && g.state === 'menu') { UI.buildMenu(); startBackdrop(); } });
UI.showMenu();
{ const room = new URLSearchParams(location.search).get('room'); if (room) { $('joinCode').value = room.toUpperCase().slice(0, 6); $('onlineBox').classList.add('invited'); UI.openSheet('online'); } }
requestAnimationFrame(frame);
