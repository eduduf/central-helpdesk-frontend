(function () {
    const PRAZOS_KEY = "central-chamados-prazos";
    const HISTORICO_KEY = "central-chamados-historico";

    function lerMapa(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return {};

            const data = JSON.parse(raw);
            if (!data || typeof data !== "object" || Array.isArray(data)) {
                throw new Error("Formato de dados locais inválido.");
            }
            return data;
        } catch (error) {
            console.error(`Não foi possível ler ${key}:`, error);
            localStorage.removeItem(key);
            window.dispatchEvent(new CustomEvent("storage-warning", {
                detail: "Os dados locais estavam inválidos e foram reiniciados."
            }));
            return {};
        }
    }

    function salvarMapa(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error(`Não foi possível salvar ${key}:`, error);
            throw new Error("Não foi possível salvar os dados locais neste navegador.");
        }
    }

    function chaveChamado(chamado) {
        if (chamado.id !== undefined && chamado.id !== null) return String(chamado.id);
        return `local-${[chamado.titulo, chamado.categoria, chamado.descricao || ""].join("|")}`;
    }

    function chaveExistente(chamado, dados) {
        const chaveId = chaveChamado(chamado);
        if (Object.prototype.hasOwnProperty.call(dados, chaveId)) return chaveId;

        const chaveLocal = `local-${[chamado.titulo, chamado.categoria, chamado.descricao || ""].join("|")}`;
        return Object.prototype.hasOwnProperty.call(dados, chaveLocal) ? chaveLocal : chaveId;
    }

    window.ChamadosStorage = {
        prazos() {
            return lerMapa(PRAZOS_KEY);
        },
        prazo(chamado) {
            const prazos = lerMapa(PRAZOS_KEY);
            return prazos[chaveExistente(chamado, prazos)] || "";
        },
        salvarPrazo(chave, prazo) {
            const prazos = lerMapa(PRAZOS_KEY);
            if (prazo) prazos[chave] = prazo;
            else delete prazos[chave];
            salvarMapa(PRAZOS_KEY, prazos);
        },
        migrarChave(chaveAntiga, chaveNova) {
            if (!chaveAntiga || !chaveNova || chaveAntiga === chaveNova) return;

            [PRAZOS_KEY, HISTORICO_KEY].forEach(key => {
                const dados = lerMapa(key);
                if (!Object.prototype.hasOwnProperty.call(dados, chaveAntiga)) return;
                dados[chaveNova] = dados[chaveAntiga];
                delete dados[chaveAntiga];
                salvarMapa(key, dados);
            });
        },
        chave(chamado) {
            return chaveChamado(chamado);
        },
        chaveExistente(chamado, dados) {
            return chaveExistente(chamado, dados);
        },
        historico(chamado) {
            const historicos = lerMapa(HISTORICO_KEY);
            return historicos[chaveExistente(chamado, historicos)] || [];
        },
        registrarHistorico(chave, acao, alteracoes = {}) {
            const historicos = lerMapa(HISTORICO_KEY);
            historicos[chave] = historicos[chave] || [];
            historicos[chave].unshift({
                acao,
                alteracoes,
                data: new Date().toISOString()
            });
            salvarMapa(HISTORICO_KEY, historicos);
        }
    };
})();
