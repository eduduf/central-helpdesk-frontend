# Central de Suporte Técnico

Aplicação web acadêmica para registrar e acompanhar chamados de suporte. A interface consome uma API REST para as operações dos chamados e usa o armazenamento local do navegador para os prazos e o histórico de alterações.

## Funcionalidades

- Criar, consultar, editar e excluir chamados.
- Pesquisar títulos em tempo real, com tolerância a erros de digitação e diferenças de acentuação; filtrar por status, prioridade e categoria.
- Ordenar por prioridade, data de criação, status, título ou prazo.
- Acompanhar um resumo do total de chamados, chamados abertos, em andamento e atrasados.
- Definir prazos e consultar o histórico de alterações de cada chamado.
- Validar campos obrigatórios e exibir mensagens de retorno para as operações.
- Usar a interface responsiva do Bootstrap em computadores e dispositivos móveis.

## Tecnologias

- HTML5 e CSS3
- JavaScript sem framework, usando `async/await`
- Bootstrap 5
- SweetAlert2
- API REST externa
- `localStorage` para informações mantidas neste navegador

## Estrutura do projeto

| Arquivo | Responsabilidade |
| --- | --- |
| [index.html](./index.html) | Estrutura da página e carregamento dos scripts |
| [style.css](./style.css) | Estilos e paleta visual |
| [app.js](./app.js) | Eventos da interface e renderização |
| [api.js](./api.js) | Requisições HTTP e configuração do token da API |
| [storage.js](./storage.js) | Acesso ao `localStorage` para prazos e histórico |

O prazo e o histórico são guardados no `localStorage` deste navegador e não são sincronizados entre dispositivos nem enviados à API. Chamados criados em outro navegador não terão o histórico local anterior.

## Como executar

1. Abra a pasta do projeto.
2. Abra `api.js` e substitua `INSIRA_SEU_TOKEN_AQUI` na constante `TOKEN` pelo seu token de acesso à API.
3. Sirva a pasta por um servidor local, por exemplo, a extensão Live Server do Visual Studio Code.
4. Abra o endereço local exibido pelo servidor.

Antes de versionar o projeto, remova o token pessoal de `api.js` e volte a usar o texto `INSIRA_SEU_TOKEN_AQUI`. Como esta aplicação é executada no navegador, o token configurado pode ser inspecionado por quem tiver acesso à página; essa configuração é adequada apenas para execução e entrega local. Em um sistema de produção, a autenticação deve ser intermediada por um servidor.

## Contexto acadêmico

O projeto demonstra integração com API REST, operações assíncronas, manipulação do DOM, validação de formulários, armazenamento local e separação entre interface e acesso HTTP.
