// Test fetch from API
fetch('http://localhost:3001/api/orcamentos')
  .then(r => r.json())
  .then(data => {
    console.log(`Total: ${data.length}`);
    if (data[0]?.eventos) {
      console.log(`✅ Eventos presentes! Count: ${data[0].eventos.length}`);
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('❌ Sem eventos na resposta');
      console.log(JSON.stringify(data[0], null, 2));
    }
  })
  .catch(e => console.error('Erro:', e));
