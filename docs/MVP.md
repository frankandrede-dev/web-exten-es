# MVP — WhatsApp Web Companion

## Resultado esperado
Extensão Manifest V3 para Chrome/Edge que personalize discretamente a interface oficial do WhatsApp Web e disponibilize painel lateral com ferramentas pessoais, sem mensalidade e sem infraestrutura externa.

## Escopo da versão 0.1
1. Painel lateral por ícone da extensão e navegação interna.
2. Dashboard com contagem de demandas abertas, em andamento, concluídas e vencidas.
3. Demandas: criação, edição, exclusão, prazo, prioridade, contato e status.
4. Notas: criação, edição, exclusão e campo de contato associado manualmente.
5. Respostas rápidas: criar, editar, excluir e copiar texto para área de transferência.
6. Aparência: tema original, suavizado ou slate; densidade e fonte.
7. Persistência em chrome.storage.local.
8. Backup e restauração de arquivos JSON locais, com validação de formato.

## Fora do escopo
- Leitura e armazenamento automatizado de conversas ou mensagens;
- Envio automático, disparos em massa, bots ou gerenciamento de grupos;
- Intercepção de sessões, cookies, chaves ou APIs internas do WhatsApp;
- Servidor, Supabase, Oracle ou integração paga;
- Sincronização entre navegadores e aplicativo móvel.

## Regras
- Todos os dados cadastrados ficam locais ao perfil do navegador.
- A extensão só altera estilos do WhatsApp Web, sem substituir sua autenticação ou mensagens.
- Os ajustes são reversíveis selecionando as preferências padrão.
- Mensagens prontas apenas são copiadas; usuário decide se deseja enviá-las.
- Não há associação automática de contatos: usuário informa manualmente o contato ao criar uma nota/tarefa.

## Critérios de aceite
- Instala e abre o painel no Chrome ou Edge compatível.
- Criar, editar e excluir demandas, notas e respostas.
- Persistência após reinicialização do navegador.
- Backup exportado pode ser importado sem executar scripts.
- Temas podem ser ativados e desativados.
- WhatsApp Web continua funcional com extensão habilitada/desabilitada.

## Próximos testes
- Instalação manual em perfis de teste do Chrome e Edge.
- Testes com interface do WhatsApp Web em modo claro e escuro.
- Exportar/importar dados, reload da extensão e navegador.
- Verificar Side Panel API e clipboardWrite em cada navegador.
- Revisar acessibilidade do painel e limite local de armazenamento.
