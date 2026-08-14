// builds sidebar with inline SVG icons so no assets required
const sidebar = document.getElementById('sidebar');
if(sidebar){
  sidebar.innerHTML = `
    <div class="brand">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M12 2l7 4v5c0 5-3 9-7 11-4-2-7-6-7-11V6l7-4z" stroke="#00ffb3" stroke-width="1.2" fill="rgba(0,0,0,0.2)"/></svg>
      <h3>SecureVault</h3>
    </div>

    <nav>
      <ul>
        <li><a href="dashboard.html" data-key="dashboard">${icon('shield')} Security Hub</a></li>
        <li><a href="website-analyzer.html" data-key="website">${icon('globe')} Website Analyzer</a></li>
        <li><a href="data-breach.html" data-key="breach">${icon('alert')} Data Breaches</a></li>
        <li><a href="file-scanner.html" data-key="file">${icon('file')} File Scanner</a></li>
        <li><a href="ai-assistant.html" data-key="ai">${icon('brain')} AI Assistant</a></li>
      </ul>
    </nav>

    <div class="sidebar-footer">
      <button id="light-toggle" class="btn ghost">Light Mode</button>
      <a href="index.html" class="btn ghost">Logout</a>
    </div>
  `;

  // mark active link
  const links = sidebar.querySelectorAll('a');
  links.forEach(a => {
    if(location.pathname.endsWith(a.getAttribute('href'))) a.classList.add('active');
  });

  // small helper to return SVGs
  function icon(name){
    const svgs = {
      shield:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2l7 4v5c0 5-3 9-7 11-4-2-7-6-7-11V6l7-4z" stroke="currentColor" stroke-width="1.2"/></svg>`,
      globe:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.2"/><path d="M2 12h20M12 2c2 6 2 14 0 20" stroke="currentColor" stroke-width="1.2"/></svg>`,
      alert:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="1.2"/><path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="1.2"/></svg>`,
      file:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="1.2"/><path d="M14 2v6h6" stroke="currentColor" stroke-width="1.2"/></svg>`,
      brain:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M2 12h20" stroke="currentColor" stroke-width="1.2"/></svg>`
    };
    return svgs[name] || svgs['shield'];
  }
}
