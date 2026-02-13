function showAlert(title, message) {
  const overlay = document.getElementById('alertOverlay');
  const titleEl = document.getElementById('alertTitle');
  const messageEl = document.getElementById('alertMessage');

  if (!overlay || !titleEl || !messageEl) {
    console.error('Alert elements not found in DOM');
    return;
  }

  titleEl.innerText = title;
  messageEl.innerText = message;
  overlay.classList.remove('hidden');
}

function closeAlert() {
  document.getElementById('alertOverlay')?.classList.add('hidden');
}
