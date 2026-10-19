# ColetaFlow — Ativação segura do primeiro administrador

Este guia pertence ao **projeto Supabase do laboratório**, não ao projeto da extensão WhatsApp. Não cadastrar pacientes reais neste procedimento.

## Situação necessária

- A aplicação autenticada está em `pilot/`; a demonstração pública está em `web/`.
- Uma conta de administrador **não** deve ser criada diretamente em `auth.users` pelo SQL Editor.
- O e-mail do administrador deve ser convidado pelo painel Supabase Auth e confirmado pelo titular.
- A senha deve ser definida pelo próprio titular. Nunca envie senha, token de convite ou chave `service_role` pelo chat.

## 1. Publicação do portal de acesso

No Cloudflare Pages, conecte `frankandrede-dev/web-exten-es` e configure:

| Campo | Valor |
|---|---|
| Branch | `feat/frontend-coletas-domiciliares` |
| Framework | None |
| Build command | Vazio |
| Output directory | `pilot` |
| Root directory | Raiz do repositório |

Anote o endereço HTTPS real retornado pelo Cloudflare, sem supor um domínio antes da implantação.

## 2. Autenticação

No Supabase do laboratório:

1. Em **Authentication → URL Configuration**, configure o endereço HTTPS real como **Site URL** e adicione-o à lista de URLs permitidos.
2. Em **Authentication → Users → Add user → Send invitation**, convide o administrador.
3. O titular abre o link, define uma senha e confirma sua identidade na aplicação.
4. Desative inscrições públicas em **Authentication → Providers / Sign In**. Não dependa apenas de filtros no JavaScript para impedir criação de contas.

Se o link do convite redirecionar para `localhost`, revise a configuração de URL antes de enviar outro convite.

## 3. Associar conta confirmada ao perfil ADMIN (executar UMA VEZ no SQL Editor)

**Somente depois de o e-mail estar confirmado em Authentication → Users**. Copie o código abaixo para o SQL Editor. Substitua `EMAIL_DO_ADMINISTRADOR` pelo e-mail autorizado. Não altere o papel de outros usuários por esse script.

```sql
do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = lower('EMAIL_DO_ADMINISTRADOR')
    and email_confirmed_at is not null
    and is_anonymous is not true
    and deleted_at is null
  limit 1;

  if v_user_id is null then
    raise exception 'Conta de administrador ainda nao existe ou nao foi confirmada';
  end if;

  if exists (select 1 from public.profiles where role = 'ADMIN') then
    raise exception 'Ja existe administrador. Reveja o procedimento manualmente';
  end if;

  insert into public.profiles(user_id,full_name,role,active)
  values (v_user_id,'Administrador do Laboratorio','ADMIN',true)
  on conflict (user_id) do nothing;

  if not found then
    raise exception 'A conta ja possui um perfil. Nenhuma alteracao foi feita';
  end if;
end $$;
```

Execute pelo SQL Editor com acesso administrativo ao projeto, nunca pelo navegador com chave publishable.

## 4. Primeiro login e equipe

Depois de inserir o perfil ADMIN:

1. Entre no portal `pilot/` com as credenciais pessoais do Supabase Auth.
2. O painel **Cadastrar profissional** será exibido apenas para `ADMIN`.
3. Convide cada profissional em Authentication → Users. Ele precisa confirmar o e-mail.
4. Cadastre o e-mail confirmado, nome, papel e equipe (se atendente/supervisor) pelo painel de administração.
5. O servidor rejeita cadastro por não administradores, contas não confirmadas, papéis `ADMIN` e substituições de perfis existentes.
6. Para coletores, a equipe não é obrigatória; o acesso a coletas será determinado pelo identificador do coletor atribuído ao agendamento.

## 5. Etapa obrigatória antes de pacientes reais

- Executar fluxo positivo com usuários fictícios em cada papel e em ambas as equipes.
- Confirmar testes negativos de RLS e das cinco RPCs, incluindo idempotência e concorrência de endereços.
- Revisar as funções SECURITY DEFINER sinalizadas no Security Advisor e manter controles de assinatura, auditoria e privilégio mínimo.
- Realizar revisão operacional e LGPD, com plano de backup/recuperação e acesso em dispositivos compartilhados.
- Definir autorização explícita do laboratório para um piloto com acesso restrito.

Este repositório não armazena senhas, convites ou dados reais de pacientes.
