fetch('http://localhost:3001/api/admin/clear-data', {
    method: 'DELETE',
    headers: {
        'x-admin-password': '8811'
    }
})
    .then(res => res.json())
    .then(data => console.log('Wipe successful:', data))
    .catch(err => console.error('Wipe failed:', err));
