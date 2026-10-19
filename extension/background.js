// O painel abre pelo ícone da extensão. Nenhuma rede ou coleta de mensagens.
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.warn("Falha ao configurar painel:", error));
}
