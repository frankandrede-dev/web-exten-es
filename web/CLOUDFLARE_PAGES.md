# Publicação gratuita da demonstração ColetaFlow — Cloudflare Pages

## Estado e segurança
**É apenas uma demonstração**. O frontend contém somente registros fictícios e opera na memória do navegador, sem autenticação nem backend. Não cadastre pacientes verdadeiros nem informe endereços reais. Ao atualizar a página, os registros demonstrativos serão perdidos.

A extensão Chrome da pasta `extension/` não será publicada no Pages; somente a pasta `web/`.

## Publicação pela interface Cloudflare

1. Acesse https://dash.cloudflare.com/ e entre na conta Cloudflare.
2. Abra **Workers & Pages**. Selecione **Create application → Pages → Connect to Git** (o texto pode variar).
3. Autorize **Cloudflare Workers and Pages** a acessar o GitHub, concedendo permissão de preferência apenas ao repositório `frankandrede-dev/web-exten-es`.
4. Escolha o repositório `frankandrede-dev/web-exten-es`.
5. Configure a branch de produção como **`feat/frontend-coletas-domiciliares`** (não use `main` neste primeiro teste).
6. Nome sugerido do projeto: **`coletaflow-demo`**, sujeito a disponibilidade. O endereço final será exibido pelo Cloudflare após publicar; **não presuma que um endereço existe antes disso**.
7. Em **Build settings**, informe:
   - Framework preset: **None** (nenhum framework)
   - Build command: **em branco** (se a interface exigir, `exit 0`)
   - Build output directory: **`web`**
   - Root directory: **`/`** (raiz do repositório, geralmente deixar em branco)
   - Environment variables: **nenhuma**
8. Clique em **Save and Deploy** / **Deploy** e acompanhe a criação.
9. Acesse o endereço `*.pages.dev` fornecido pelo Cloudflare e teste em computador e celular.
10. Confira se o navegador recebe os cabeçalhos de segurança em `web/_headers` e se `robots.txt` responde. Eles apenas reduzem indexação; **não impedem acesso público**.

## Testes de aceite

- [ ] Carrega tela inicial em desktop e celular
- [ ] Abre menu lateral no celular
- [ ] Permite criar agendamento **com dados fictícios**
- [ ] Mostra registros de exemplo nas duas equipes
- [ ] Exibe somente o coletor de demonstração ao alternar perfil
- [ ] Permite avançar status simulado de execução
- [ ] Permite corrigir endereço fictício e consultar histórico anterior
- [ ] Recarregar a página elimina os agendamentos criados no teste
- [ ] Confirma que nenhuma requisição à API do Supabase é realizada

## Observações para o futuro

- Não mescle esta versão à branch principal até revisar a interface.
- O deploy da branch selecionada será atualizado automaticamente com novos commits.
- O `web/_headers` bloqueia conexões externas no navegador (`connect-src 'none'`) intencionalmente para esta demonstração; **deverá ser revisto quando implementarmos o Supabase**.
- Os cabeçalhos `noindex` e `robots.txt` não protegem dados nem substituem um login real. Em produção, proteger com autenticação e permissões RLS no Supabase.
- Para uma versão de uso operacional, primeiro concluir operações de backend, segurança, privacidade, testes, backup e controles de acesso.

Documentação: https://developers.cloudflare.com/pages/get-started/git-integration/
