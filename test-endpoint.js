// Test fetch from test endpoint
fetch('http://localhost:3001/api/test')
  .then(r => r.json())
  .then(data => {
    console.log('=== Test Endpoint Result ===');
    console.log('Total orçamentos:', data.total);
    console.log('Primeiro tem eventos:', data.primeiroTemEventos);
    if (data.eventos && data.eventos.length > 0) {
      console.log('✅ Eventos encontrados!');
      data.eventos.forEach(e => console.log(`  - ${e.descricao} (${e.tipo})`));
    } else {
      console.log('❌ Nenhum evento');
    }
  })
  .catch(e => console.error('Erro:', e));
