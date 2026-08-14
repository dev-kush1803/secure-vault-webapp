// persist theme toggle — very small helper
const saved = localStorage.getItem('securevault_theme');
if(saved === 'light') document.documentElement.classList.add('light');

document.getElementById('light-toggle')?.addEventListener('click', ()=>{
  const isLight = document.documentElement.classList.toggle('light');
  localStorage.setItem('securevault_theme', isLight ? 'light' : 'dark');
  document.querySelectorAll('#sidebar a.active, #sidebar a:hover').forEach(n=>n.style.boxShadow='0 8px 24px rgba(0,255,179,0.08)');
});
