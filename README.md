# Paróquia Rainha Santa Isabel

Site institucional da Paróquia Rainha Santa Isabel, com frontend React/Vite e
backend Express.

## Estrutura

- `frontend/`: aplicação React, estilos, componentes, assets e configuração do Vite.
- `backend/`: servidor Express e persistência local em JSON.
- `shared/`: tipos usados pelo frontend e pelo backend.
- `package.json`: dependências e comandos do projeto.

## Desenvolvimento

Requisitos: Node.js e npm.

```bash
npm ci
```

Copie `.env.example` para `.env`, configure um valor único e forte para
`ADMIN_PASSWORD` e ajuste as demais configurações. O servidor não inicia se essa
senha não estiver definida. Depois, inicie frontend e backend juntos:

```bash
npm run dev
```

O servidor fica disponível em `http://localhost:3000` por padrão.

## Build e produção

```bash
npm run lint
npm run build
npm start
```

O build do frontend é gerado em `frontend/dist`. Em produção, o Express serve
essa pasta e disponibiliza as rotas da API no mesmo host. Os dados locais ficam
em `backend/data/church.json` por padrão; `DATA_FILE` pode apontar para um volume
persistente no provedor de hospedagem.

## GitHub Pages

O workflow `.github/workflows/pages.yml` compila o frontend e publica
`frontend/dist` quando há alterações na branch `main`. Para ativar:

1. Abra **Settings → Pages** no repositório.
2. Em **Build and deployment → Source**, selecione **GitHub Actions**.
3. Aguarde o workflow terminar em **Actions**. O site ficará em
   `https://igorpaulorezende.github.io/Rainha-Santa-Isabel/`.

O GitHub Pages hospeda somente conteúdo estático; ele não executa o servidor
Express. Recursos que dependem da API, como administração e formulários, não
funcionarão no Pages sem hospedar a API em outro serviço e configurar o frontend
para usá-la.
