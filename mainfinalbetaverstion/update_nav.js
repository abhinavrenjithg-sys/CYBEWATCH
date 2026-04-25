const fs = require('fs');
const files = ['index.html', 'dashboard.html', 'topology.html', 'alerts.html', 'settings.html', 'about.html', 'pricing.html'];
const searchStr = `<a class="nav-item" data-nav="investigation" href="investigation.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><span class="nav-item-text">Investigation</span></a>`;
const replaceStr = searchStr + `\n      <a class="nav-item" data-nav="playbooks" href="playbooks.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="2" y1="12" x2="5" y2="12"/></svg><span class="nav-item-text">Playbooks</span></a>`;

files.forEach(f => {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf8');
    if (!c.includes('playbooks.html')) {
        // Handle potential spaces or active classes
        let updated = false;
        if(c.includes(searchStr)) { c = c.replace(searchStr, replaceStr); updated = true; }
        else {
             // Let's try flexible search
             const s2 = `<a class="nav-item active" data-nav="investigation" href="investigation.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><span class="nav-item-text">Investigation</span></a>`;
             if(c.includes(s2)) { 
                 c = c.replace(s2, s2 + `\n      <a class="nav-item" data-nav="playbooks" href="playbooks.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="2" y1="12" x2="5" y2="12"/></svg><span class="nav-item-text">Playbooks</span></a>`);
                 updated = true;
             }
        }
        if (updated) {
            fs.writeFileSync(f, c);
            console.log('Updated', f);
        } else {
            console.log('Failed to match search string in', f);
        }
    } else {
        console.log('Skipped ' + f);
    }
  }
});
