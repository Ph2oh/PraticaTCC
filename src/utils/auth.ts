// Utilidade para capturar o token JWT do localStorage de forma síncrona
// e anexá-lo aos cabeçalhos (Headers) padrão das requisições fetch.
export const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
    const token = localStorage.getItem('sgo_token');
    return {
        ...extraHeaders,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};
