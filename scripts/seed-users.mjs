import bcrypt from 'bcryptjs';

const users = [
  { username: 'andi.raharja', name: 'Andi Raharja', position: 'Kabag Operasional', role: 'admin', password: 'andi1234' },
  { username: 'dimas.andaru', name: 'Dimas Andaru', position: 'PJ Samsat Pekanbaru Kota', role: 'super_admin', password: 'dimas1234' },
  { username: 'hamzah.arridho', name: 'Hamzah Arridho', position: 'Kasubag SW', role: 'admin', password: 'hamzah1234' },
  { username: 'siti.izriskiah', name: 'Siti Izriskiah', position: 'PJ Samsat Pekanbaru Selatan', role: 'user', password: 'siti1234' },
  { username: 'imelda.kusumastuti', name: 'Imelda Kusumastuti', position: 'PA Samsat Rumbai', role: 'user', password: 'imelda1234' },
  { username: 'rahmalina', name: 'Rahmalina', position: 'Staff Adm. Tk. I Samsat Panam', role: 'user', password: 'lina1234' },
  { username: 'luisi.handayani', name: 'Luisi Handayani', position: 'Staff SW & Humas', role: 'admin', password: 'luisi1234' },
];

const salt = bcrypt.genSaltSync(10);

for (const u of users) {
  const hash = bcrypt.hashSync(u.password, salt);
  console.log(`INSERT INTO public.app_users (username, name, position, role, password_hash, active) VALUES ('${u.username}', '${u.name}', '${u.position}', '${u.role}', '${hash}', true) ON CONFLICT (username) DO UPDATE SET name='${u.name}', position='${u.position}', role='${u.role}', password_hash='${hash}', active=true;`);
  console.log(`-- ${u.username} -> ${u.password}`);
}
