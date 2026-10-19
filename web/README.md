# ColetaFlow — Frontend do laboratório (demonstração)

Primeira versão do frontend para **coletas domiciliares**, criada em `web/` sem substituir a extensão existente em `extension/`.

## Como abrir

Abra `web/index.html` no Chrome ou Edge moderno, ou sirva a pasta como arquivos estáticos. Exemplo com Python:

```bash
python -m http.server 8080 --directory web
```

Depois abra `http://localhost:8080`.

### Cloudflare Pages (posteriormente)

Conecte o repositório GitHub ao Cloudflare Pages e defina:

- **Framework preset:** None
- **Build command:** (em branco)
- **Build output directory:** `web`
- **Root directory:** raiz do repositório

A publicação não foi realizada e **não existe backend conectado a este frontend**.

## O que já pode ser testado

- Navegação de atendimento, agenda, coletores e relatórios.
- Troca de perfil de demonstração (Atendente, Coletor 01, Supervisor).
- Novo agendamento domiciliar com paciente, telefone, endereço, data, horário e coletor.
- Múltiplas coletas com a mesma data/hora (sem bloqueio por vagas).
- Filtros de equipe, status, coletor e busca.
- Portal mobile do Coletor 01 exibindo somente atribuições dele na simulação.
- Progressão de etapas: agendada → ciente → em deslocamento → no local → em coleta → realizada.
- Registro de não realização (motivo obrigatório).
- Correção direta do endereço com motivo obrigatório e histórico completo de versões, sem apagar o endereço anterior.
- Cópia de mensagem de confirmação, com envio manual pelo WhatsApp.

## Limitações importantes

**Somente demonstração:** os registros são fictícios, ficam em memória e desaparecem ao recarregar a página. O seletor de perfis não é autenticação; os filtros de visibilidade do protótipo **não são controles de segurança**.

**Não inserir dados reais de pacientes.** O frontend não foi validado para produção, LGPD, autenticação, retenção de dados ou backup.

Nenhuma API do WhatsApp é utilizada. Nenhum dado é enviado ao Supabase. A versão original da extensão continua independente.

## Próximos incrementos

1. Integrar Supabase Auth de maneira segura, substituindo o seletor de perfil.
2. Completar as funções RPC do backend para cadastrar, atribuir, executar e corrigir endereços.
3. Conectar a interface às tabelas e funções autorizadas usando chave publishable + sessões de usuário; nunca incluir service_role na interface.
4. Validar RLS para cada perfil e duas equipes, incluindo correção concorrente de endereços.
5. Integrar à extensão como painel autenticado, com identidade visual compartilhada.
6. Fazer testes com **dados fictícios** e uma revisão formal de privacidade antes do uso operacional.

Os textos, locais, pacientes, datas, contatos e equipes são exemplos para demonstração.
