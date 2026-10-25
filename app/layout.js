import './globals.css';

export const metadata = {
  title: 'EduGap-XAI | Peta kesenjangan partisipasi sekolah menengah Indonesia',
  description: 'Peta, pola risiko, proyeksi 2026-2027, dan prioritas intervensi partisipasi sekolah usia 16-18 tahun di 38 provinsi Indonesia, berbasis data BPS 2021-2025.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'EduGap-XAI',
    description: 'Sistem cerdas peringatan dini kesenjangan partisipasi sekolah menengah antarprovinsi di Indonesia.',
    type: 'website',
    locale: 'id_ID',
  },
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#7a5233' };

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
