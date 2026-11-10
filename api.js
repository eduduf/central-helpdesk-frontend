(function () {
    const API_URL = "https://felipemaciel.com.br/_fatec/api/central-chamados/chamados";
    const TOKEN = "INSIRA_SEU_TOKEN_AQUI";

    async function request(url, options = {}) {
        if (!TOKEN || TOKEN === "INSIRA_SEU_TOKEN_AQUI") {
            throw new Error("Insira seu token da API na constante TOKEN em api.js.");
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                Authorization: `Bearer ${TOKEN}`,
                ...options.headers
            }
        });

        let data = null;
        if (response.status !== 204) {
            const text = await response.text();
            if (text) {
                try {
                    data = JSON.parse(text);
                } catch {
                    throw new Error(`A API retornou uma resposta inválida (HTTP ${response.status}).`);
                }
            }
        }

        if (!response.ok) {
            const error = new Error(data?.erro?.mensagem || `Erro HTTP: ${response.status}`);
            error.status = response.status;
            throw error;
        }

        return data;
    }

    window.ChamadosAPI = {
        listar() {
            return request(API_URL);
        },
        salvar(id, chamado) {
            return request(id ? `${API_URL}/${encodeURIComponent(id)}` : API_URL, {
                method: id ? "PUT" : "POST",
                body: JSON.stringify(chamado)
            });
        },
        excluir(id) {
            return request(`${API_URL}/${encodeURIComponent(id)}`, {
                method: "DELETE"
            });
        }
    };
})();
