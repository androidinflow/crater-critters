// boot
resize();
Terrain.init();
bindPointer(canvas);
bindTouchButtons();
Chat.init(); Full.init();
if (window.matchMedia && matchMedia('(pointer: coarse)').matches) UI.showTouch(true);
UI.showMenu();
{ const room = new URLSearchParams(location.search).get('room'); if (room) { $('joinCode').value = room.toUpperCase().slice(0, 6); $('onlineBox').classList.add('invited'); } }
requestAnimationFrame(frame);
