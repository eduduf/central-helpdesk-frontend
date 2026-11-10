let chamadosData = [];
const prioridadeOrdem = { alta: 0, media: 1, baixa: 2 };

document.addEventListener("DOMContentLoaded", () => {
    carregarChamados();
    
    document.getElementById("form-chamado").addEventListener("submit", salvarChamado);
    document.getElementById("btn-cancelar").addEventListener("click", resetarFormulario);
    document.getElementById("busca-titulo").addEventListener("input", renderizarChamados);
    document.getElementById("filtro-status").addEventListener("change", renderizarChamados);
    document.getElementById("filtro-prioridade").addEventListener("change", renderizarChamados);
    document.getElementById("filtro-categoria").addEventListener("change", renderizarChamados);
    document.getElementById("ordenacao").addEventListener("change", renderizarChamados);
    window.addEventListener("storage-warning", (event) => {
        Swal.fire("Aviso", event.detail, "warning");
    });
    document.getElementById("lista-chamados").addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const { action, id } = button.dataset;
        if (action === "edit") editarChamado(id);
        if (action === "delete") confirmarExclusao(id);
        if (action === "history") mostrarHistorico(id);
    });
});

function timestampCriacao(chamado) {
    const data = chamado.created_at || chamado.createdAt || chamado.data_criacao || chamado.dataCriacao;
    const timestamp = data ? Date.parse(data) : 0;
    if (!Number.isNaN(timestamp) && timestamp) return timestamp;
    const id = Number(chamado.id);
    return Number.isFinite(id) ? id : 0;
}

async function carregarChamados() {
    mostrarLoading(true);
    try {
        const data = await ChamadosAPI.listar();
        chamadosData = data.dados || [];
        renderizarChamados();
    } catch (error) {
        console.error("Falha ao carregar chamados:", error);
        Swal.fire("Erro", error.message || "Não foi possível carregar os chamados.", "error");
    } finally {
        mostrarLoading(false);
    }
}

function mostrarHistorico(id) {
    const chamado = chamadosData.find(item => String(item.id) === String(id));
    if (!chamado) return;

    const registros = ChamadosStorage.historico(chamado);
    const html = registros.length
        ? `<ul class="list-group text-start">${registros.map(registro => {
            const detalhes = Object.entries(registro.alteracoes)
                .map(([campo, valores]) => `<li><strong>${escaparHTML(campo)}:</strong> ${escaparHTML(valores)}</li>`)
                .join("");
            return `<li class="list-group-item"><strong>${escaparHTML(registro.acao)}</strong><br><small>${new Date(registro.data).toLocaleString("pt-BR")}</small>${detalhes ? `<ul class="mt-2">${detalhes}</ul>` : ""}</li>`;
        }).join("")}</ul>`
        : '<p class="text-muted mb-0">Ainda não há alterações registradas neste navegador.</p>';

    Swal.fire({
        title: `Histórico do chamado #${escaparHTML(id)}`,
        html,
        confirmButtonText: "Fechar"
    });
}

function dataLocalAtual() {
    const data = new Date();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${data.getFullYear()}-${mes}-${dia}`;
}

function escaparHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function normalizarBusca(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR")
        .trim();
}

function distanciaEdicao(primeira, segunda) {
    let anterior = Array.from({ length: segunda.length + 1 }, (_, index) => index);

    for (let linha = 1; linha <= primeira.length; linha++) {
        const atual = [linha];
        for (let coluna = 1; coluna <= segunda.length; coluna++) {
            const custo = primeira[linha - 1] === segunda[coluna - 1] ? 0 : 1;
            atual[coluna] = Math.min(
                atual[coluna - 1] + 1,
                anterior[coluna] + 1,
                anterior[coluna - 1] + custo
            );
        }
        anterior = atual;
    }

    return anterior[segunda.length];
}

function pontuacaoTitulo(titulo, termo) {
    const consulta = normalizarBusca(termo);
    if (!consulta) return 0;

    const tituloNormalizado = normalizarBusca(titulo);
    const palavrasTitulo = tituloNormalizado.split(/\s+/);
    const palavrasConsulta = consulta.split(/\s+/);
    let pontuacao = 0;

    for (const palavraConsulta of palavrasConsulta) {
        let melhorPontuacao = 0;

        for (const palavraTitulo of palavrasTitulo) {
            if (palavraTitulo === palavraConsulta) {
                melhorPontuacao = Math.max(melhorPontuacao, 3);
                continue;
            }
            if (palavraTitulo.includes(palavraConsulta)) {
                melhorPontuacao = Math.max(melhorPontuacao, 2);
                continue;
            }

            const limiteErros = palavraConsulta.length >= 8 ? 2 : palavraConsulta.length >= 4 ? 1 : 0;
            if (limiteErros && Math.abs(palavraTitulo.length - palavraConsulta.length) <= limiteErros) {
                const distancia = distanciaEdicao(palavraConsulta, palavraTitulo);
                if (distancia <= limiteErros) {
                    melhorPontuacao = Math.max(melhorPontuacao, 1 + 1 / (distancia + 1));
                }
            }
        }

        if (!melhorPontuacao) return 0;
        pontuacao += melhorPontuacao;
    }

    return pontuacao;
}

function atualizarResumo() {
    const prazos = ChamadosStorage.prazos();
    const hoje = dataLocalAtual();
    document.getElementById("resumo-total").textContent = chamadosData.length;
    document.getElementById("resumo-abertos").textContent =
        chamadosData.filter(chamado => chamado.status === "aberto").length;
    document.getElementById("resumo-andamento").textContent =
        chamadosData.filter(chamado => chamado.status === "em_andamento").length;
    document.getElementById("resumo-atrasados").textContent =
        chamadosData.filter(chamado => {
            const prazo = prazos[ChamadosStorage.chaveExistente(chamado, prazos)];
            return prazo && prazo < hoje && chamado.status !== "concluido";
        }).length;
}

function renderizarChamados() {
    const termoBusca = document.getElementById("busca-titulo").value;
    const filtroStatus = document.getElementById("filtro-status").value;
    const filtroPrioridade = document.getElementById("filtro-prioridade").value;
    const filtroCategoria = document.getElementById("filtro-categoria").value;
    const ordenacao = document.getElementById("ordenacao").value;
    const container = document.getElementById("lista-chamados");
    const prazos = ChamadosStorage.prazos();

    atualizarResumo();
    container.innerHTML = "";

    const chamadosComPontuacao = chamadosData.map(chamado => ({
        chamado,
        pontuacao: pontuacaoTitulo(chamado.titulo, termoBusca)
    }));
    const chamadosFiltrados = chamadosComPontuacao.filter(({ chamado, pontuacao }) => {
        const matchStatus = filtroStatus === "" || chamado.status === filtroStatus;
        const matchPrioridade = filtroPrioridade === "" || chamado.prioridade === filtroPrioridade;
        const matchCategoria = filtroCategoria === "" || chamado.categoria === filtroCategoria;
        const matchTitulo = !normalizarBusca(termoBusca) || pontuacao > 0;
        return matchTitulo && matchStatus && matchPrioridade && matchCategoria;
    }).map(({ chamado, pontuacao }) => ({ chamado, pontuacaoBusca: pontuacao }));

    if (!ordenacao && termoBusca.trim()) {
        chamadosFiltrados.sort((a, b) => b.pontuacaoBusca - a.pontuacaoBusca);
    } else if (ordenacao === "prioridade") {
        chamadosFiltrados.sort((a, b) => (prioridadeOrdem[a.chamado.prioridade] ?? 99) - (prioridadeOrdem[b.chamado.prioridade] ?? 99));
    } else if (ordenacao === "criacao") {
        chamadosFiltrados.sort((a, b) => timestampCriacao(b.chamado) - timestampCriacao(a.chamado));
    } else if (ordenacao === "status") {
        const statusOrdem = { aberto: 0, em_andamento: 1, concluido: 2 };
        chamadosFiltrados.sort((a, b) => (statusOrdem[a.chamado.status] ?? 99) - (statusOrdem[b.chamado.status] ?? 99));
    } else if (ordenacao === "titulo") {
        chamadosFiltrados.sort((a, b) => a.chamado.titulo.localeCompare(b.chamado.titulo, "pt-BR"));
    } else if (ordenacao === "prazo") {
        chamadosFiltrados.sort((a, b) => {
            const prazoA = prazos[ChamadosStorage.chaveExistente(a.chamado, prazos)] || "9999-12-31";
            const prazoB = prazos[ChamadosStorage.chaveExistente(b.chamado, prazos)] || "9999-12-31";
            return prazoA.localeCompare(prazoB);
        });
    }

    if (chamadosFiltrados.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-4">Nenhum chamado encontrado.</div>';
        return;
    }

    chamadosFiltrados.forEach(({ chamado: c }) => {
        const div = document.createElement("div");
        div.className = "list-group-item ticket-list-item";
        const prioridadeClass = {
            alta: "bg-danger",
            media: "bg-warning text-dark",
            baixa: "bg-success"
        }[c.prioridade];
        const statusClass = {
            aberto: "bg-info text-dark",
            em_andamento: "bg-warning text-dark",
            concluido: "bg-success"
        }[c.status];
        const prazo = prazos[ChamadosStorage.chaveExistente(c, prazos)];
        const atrasado = prazo && prazo < dataLocalAtual() && c.status !== "concluido";
        div.innerHTML = `
            <div class="ticket-row ${atrasado ? "ticket-overdue" : ""}">
                <div class="ticket-content">
                    <div class="ticket-heading">
                        <h3 class="ticket-title" title="${escaparHTML(c.titulo)}">${escaparHTML(c.titulo)}</h3>
                        <span class="ticket-category">${escaparHTML(c.categoria.toUpperCase())}</span>
                    </div>
                    <p class="ticket-description">${escaparHTML(c.descricao || "Sem descrição")}</p>
                    <div class="ticket-badges">
                        <span class="badge ${prioridadeClass}">Prioridade: ${escaparHTML(c.prioridade)}</span>
                        <span class="badge ${statusClass}">Status: ${escaparHTML(c.status.replace("_", " "))}</span>
                    </div>
                    ${prazo ? `<p class="ticket-deadline ${atrasado ? "text-danger fw-semibold" : ""}">Prazo: ${escaparHTML(new Date(`${prazo}T00:00:00`).toLocaleDateString("pt-BR"))}${atrasado ? " · Atrasado" : ""}</p>` : ""}
                </div>
                <div class="ticket-actions">
                    <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${escaparHTML(c.id)}">Editar</button>
                    <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${escaparHTML(c.id)}">Excluir</button>
                    <button class="btn btn-sm btn-outline-secondary" data-action="history" data-id="${escaparHTML(c.id)}">Histórico</button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

async function salvarChamado(event) {
    event.preventDefault();
    const form = document.getElementById("form-chamado");
    form.classList.add("was-validated");
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const id = document.getElementById("chamado-id").value;
    const prazo = document.getElementById("prazo").value;
    const chamadoAnterior = chamadosData.find(item => String(item.id) === String(id));
    const chaveAnterior = chamadoAnterior
        ? ChamadosStorage.chaveExistente(chamadoAnterior, ChamadosStorage.prazos())
        : "";
    const prazoAnterior = chamadoAnterior ? ChamadosStorage.prazo(chamadoAnterior) : "";
    
    const payload = {
        titulo: document.getElementById("titulo").value,
        descricao: document.getElementById("descricao").value,
        categoria: document.getElementById("categoria").value,
        prioridade: document.getElementById("prioridade").value
    };

    if (id) {
        payload.status = document.getElementById("status").value;
    }

    try {
        mostrarLoading(true);
        const resposta = await ChamadosAPI.salvar(id || null, payload);

        const chamadoSalvo = {
            ...payload,
            id: chamadoAnterior?.id ?? resposta?.dados?.id ?? resposta?.dados?.[0]?.id ?? resposta?.id
        };
        const chaveApi = chamadoSalvo.id === undefined || chamadoSalvo.id === null
            ? null
            : String(chamadoSalvo.id);
        const chave = chamadoAnterior ? chaveAnterior : ChamadosStorage.chave(chamadoSalvo);
        const chaveFinal = chaveApi || chave;
        ChamadosStorage.migrarChave(chave, chaveFinal);
        ChamadosStorage.salvarPrazo(chaveFinal, prazo);

        const alteracoes = {};
        if (chamadoAnterior) {
            const campos = {
                titulo: "Título",
                descricao: "Descrição",
                categoria: "Categoria",
                prioridade: "Prioridade",
                status: "Status"
            };
            Object.entries(campos).forEach(([campo, nome]) => {
                if (chamadoAnterior[campo] !== payload[campo]) {
                    alteracoes[nome] = `${chamadoAnterior[campo] || "vazio"} → ${payload[campo] || "vazio"}`;
                }
            });
            if (prazoAnterior !== prazo) alteracoes.Prazo = `${prazoAnterior || "sem prazo"} → ${prazo || "sem prazo"}`;
        } else {
            alteracoes.Título = payload.titulo;
            alteracoes.Categoria = payload.categoria;
            alteracoes.Prioridade = payload.prioridade;
            if (prazo) alteracoes.Prazo = prazo;
        }
        ChamadosStorage.registrarHistorico(
            chaveFinal,
            chamadoAnterior ? "Chamado atualizado" : "Chamado criado",
            alteracoes
        );

        Swal.fire("Sucesso!", `Chamado ${id ? 'atualizado' : 'criado'} com sucesso.`, "success");
        resetarFormulario();
        carregarChamados();
    } catch (error) {
        if (error.status === 400 || error.status === 422) {
            Swal.fire("Atenção", error.message || "Verifique os dados informados.", "warning");
            return;
        }
        console.error("Falha ao salvar chamado:", error);
        Swal.fire("Erro", error.message || "Ocorreu um erro ao salvar o chamado.", "error");
    } finally {
        mostrarLoading(false);
    }
}

function editarChamado(id) {
    const chamado = chamadosData.find(c => String(c.id) === String(id));
    if (!chamado) return;

    document.getElementById("form-title").innerText = "Editar Chamado";
    document.getElementById("chamado-id").value = chamado.id;
    document.getElementById("titulo").value = chamado.titulo;
    document.getElementById("descricao").value = chamado.descricao;
    document.getElementById("categoria").value = chamado.categoria;
    document.getElementById("prioridade").value = chamado.prioridade;
    document.getElementById("prazo").value = ChamadosStorage.prazo(chamado);
    
    document.getElementById("status-container").style.display = "block";
    document.getElementById("status").value = chamado.status;
    
    document.getElementById("btn-salvar").innerText = "Atualizar Chamado";
    document.getElementById("btn-cancelar").style.display = "inline-block";
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetarFormulario() {
    const form = document.getElementById("form-chamado");
    form.reset();
    form.classList.remove("was-validated");
    document.getElementById("chamado-id").value = "";
    document.getElementById("form-title").innerText = "Novo Chamado";
    document.getElementById("status-container").style.display = "none";
    document.getElementById("btn-salvar").innerText = "Salvar Chamado";
    document.getElementById("btn-cancelar").style.display = "none";
}

function confirmarExclusao(id) {
    Swal.fire({
        title: 'Tem certeza?',
        text: "Esta ação não poderá ser desfeita!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) excluirChamado(id);
    });
}

async function excluirChamado(id) {
    try {
        mostrarLoading(true);
        await ChamadosAPI.excluir(id);
        Swal.fire("Excluído!", "O chamado foi removido.", "success");
        carregarChamados();
    } catch (error) {
        console.error("Falha ao excluir chamado:", error);
        Swal.fire("Erro", error.message || "Não foi possível excluir o chamado.", "error");
    } finally {
        mostrarLoading(false);
    }
}

function mostrarLoading(show) {
    document.getElementById("loading").style.display = show ? "block" : "none";
}