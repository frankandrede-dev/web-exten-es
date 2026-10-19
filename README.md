# WhatsApp Web Companion

Extensão local gratuita para Google Chrome e Microsoft Edge, compatível com Manifest V3.

## Objetivo

Personalizar visualmente o WhatsApp Web e oferecer um painel lateral próprio com:
- Dashboard de demandas;
- Cadastro e acompanhamento de tarefas;
- Anotações;
- Respostas rápidas com botão de copiar;
- Ajustes de aparência reversíveis;
- Backup e restauração dos dados locais.

**Escopo:** não coleta automaticamente mensagens, não monitora grupos, não utiliza APIs internas do WhatsApp e não envia mensagens automaticamente.

## Instalação (sem servidor)

1. Baixe o repositório como ZIP e extraia.
2. Abra `chrome://extensions` ou `edge://extensions`.
3. Ative **Modo do desenvolvedor**.
4. Selecione **Carregar sem compactação**.
5. Escolha a pasta `extension`.
6. Abra `https://web.whatsapp.com/` e clique no ícone da extensão para abrir o painel.

## Tecnologias

JavaScript, HTML, CSS, Manifest V3, Chrome Side Panel API e `chrome.storage.local`.

Escolhemos uma implementação sem etapa de build para permitir instalação imediata e custo zero. React/TypeScript podem ser introduzidos futuramente sem afetar os dados.

## Privacidade e limitações

- As notas, tarefas e respostas rápidas ficam no armazenamento local do navegador.
- O painel não lê conversas privadas e não acessa tokens ou sessões do WhatsApp.
- Alterações visuais suaves podem precisar de ajustes após atualizações do WhatsApp Web.
- Exportar backup periodicamente: desinstalar a extensão pode eliminar seus dados locais.
- A extensão é para navegadores desktop; não é um cliente alternativo do WhatsApp.

## Estado

MVP inicial de desenvolvimento: testar localmente antes de distribuir ou usar com dados sensíveis.

Veja o detalhamento em [docs/MVP.md](docs/MVP.md).
