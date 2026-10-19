# ColetaFlow — Portal autenticado de preparação para piloto

> **NÃO UTILIZAR DADOS REAIS ATÉ APROVAÇÃO DOS TESTES DE SEGURANÇA E DA PRIVACIDADE PELO LABORATÓRIO.**

Este portal é **separado** da demonstração pública em `web/`. O frontend usa Supabase Auth e funções PostgreSQL RPC autorizadas com autenticação.

## Endpoints e chaves

- URL pública: `https://wezwsnwndazsxtrklgxg.supabase.co`
- Chave: **publishable**, destinada a aplicativos de navegador; não é uma chave de administrador.
- Nenhuma chave secreta/service_role deve ser copiada para a aplicação ou para o GitHub.
- Todas as ações de escrita são realizadas por RPCs com validação de permissões no servidor.

## Primeiro administrador

1. Publicar **somente o portal técnico `pilot/`** em um projeto Cloudflare Pages separado. O endereço `https://*.pages.dev` precisa existir antes de enviar convites.
2. No Supabase, configurar **Authentication → URL Configuration → Site URL** para o URL real do portal `pilot/` publicado, e incluí-lo em **Redirect URLs**.
3. Em **Authentication → Users → Add user → Send invitation**, enviar o convite ao e-mail do administrador. A inclusão via painel é necessária porque o conector Supabase não fornece uma ação para enviar convites Auth.
4. O convidado abre o link recebido, que o redireciona para o portal e permite definir uma senha pessoal (mínimo de 12 caracteres). **Não compartilhar senha com o assistente.**
5. Após a confirmação da identidade no Supabase Auth, o administrador do banco provisiona o perfil com papel `ADMIN` em `public.profiles` por SQL administrativo autenticado ou outra ferramenta protegida; este passo **não é automático**.
6. Validar login e permissões com contas fictícias antes de qualquer coleta real. Desabilitar inscrição pública após definir o procedimento de convites.

Nenhuma senha, token de convite ou chave secreta deve ser armazenada no repositório.

## Antes de usar com pacientes reais

1. **Configurar Supabase Auth** em Authentication > Providers/Sign In:
   - Desabilitar novas inscrições públicas (**Allow new users to sign up**).
   - Manter contas individuais verificadas e MFA conforme política do laboratório.
   - Configurar URLs de redirecionamento quando o domínio Cloudflare estiver definido.
   - Convidar colaboradores em Authentication > Users > Add user > Send invitation.
2. **Cadastrar as permissões dos usuários** em `profiles` e `team_memberships`, somente pela área administrativa segura do Supabase.
   - Perfil `ATTENDANT` precisa pertencer à equipe com membership_role = ATTENDANT.
   - Perfil `SUPERVISOR` precisa pertencer à equipe com membership_role = SUPERVISOR.
   - Perfil `COLLECTOR` precisa estar vinculado a um registro ativo em `collectors`.
   - Perfil `ADMIN` pode administrar ambos os canais; estabelecer controle interno para administradores.
   - Não permitir autoatribuição de papéis.
3. **Testes negativos e positivos com usuários fictícios e contas de teste**:
   - Atendente do WhatsApp 01 não consulta pacientes nem coletas do WhatsApp 02.
   - Coletor vê apenas coletas atribuídas, inclusive de ambos os canais quando for o caso.
   - Coletor não pode cancelar nem atribuir outras coletas.
   - Alteração de endereço após encerramento é recusada.
   - Correção concorrente por versão (409/40001) impede sobrescrever dados.
   - Usuário sem perfil não pode ler ou gravar dados.
   - Sessões expiradas, logout e acesso em dispositivos compartilhados.
   - Testar histórico de alterações e logs após cada ação.
4. **Revisar segurança, privacidade e operação**:
   - A entidade controladora do laboratório deve definir base legal aplicável, aviso de privacidade, controles de acesso, retenção e resposta a incidentes, avaliando LGPD e eventuais dados de saúde.
   - Não armazenar tipo de exame, resultado, convênio ou dados clínicos nesta versão.
   - Planejar backup, teste de restauração e tratamento de indisponibilidade.
   - Aprovar publicação HTTPS, política de aparelhos e treinamento.
5. **Piloto real restrito**, após aprovação: 1 atendente, 1 coletor, 1 supervisor; pequenos lotes de agendamentos e auditoria diária.

## Abrir localmente para testes técnicos

```bash
python -m http.server 8080 --directory pilot
```

Abra `http://localhost:8080`. A página de login somente funcionará quando houver contas Supabase autorizadas. Não insira pacientes reais para testar a interface.

## Cloudflare Pages

Crie **um projeto separado** da demo, publicando a pasta `pilot`:
- Repositório: `frankandrede-dev/web-exten-es`
- Branch: `feat/frontend-coletas-domiciliares`
- Framework: None
- Build: em branco
- Output directory: `pilot`
- Environment variables: nenhuma

**Não publicar para teste real sem concluir os controles de acesso e o processo de liberação.** Os arquivos `_headers` e `robots.txt` não substituem login e proteções no banco.

## Limitações desta versão
- Sessão apenas em memória: atualização ou fechamento da aba exige novo login.
- Não possui cadastro administrativo de equipes/usuários; a criação é por administrador no Supabase.
- Listagem limitada a 200 agendamentos por carga; paginação é melhoria futura.
- Não há sincronização push via Realtime; botão Atualizar recarrega os registros.
- Histórico administrativo e versões de endereço são apresentados em **Ver histórico**, com permissões protegidas por RLS.
- Não foi feito teste ponta a ponta com contas de colaboradores reais.
- Sem testes reais de segregação por múltiplas contas até o cadastro dos usuários de teste.
- Pendências de acessibilidade, revisão de segurança independente, avaliação de privacidade e aprovação do laboratório.
