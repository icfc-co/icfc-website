export default function HomePage() {
  return (
    <section className="relative text-center px-4 py-32 text-white bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/WelcomeICFC.jpg')" }}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black opacity-50"></div>

      {/* Content */}
      <div className="relative z-10">
        <h1 className="text-4xl font-bold mb-4">Welcome to ICFC</h1>
        <p className="text-lg mb-8">Serving the Muslim community of Fort Collins</p>
        <a
          href="/modules/prayer-times"
          className="inline-block bg-blue-800 text-white px-6 py-2 rounded hover:bg-blue-900 transition"
        >
          View Prayer Times
        </a>
      </div>
    </section>
  );
}
