import './App.css'

function BrandMark() {
  return (
    <svg
      className="brand-mark"
      viewBox="0 0 440 390"
      role="img"
      aria-label="Emblema de AeroLuferan: casco de vigilancia y dos drones"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M35 196c38-49 92-91 151-122l34 31-29 34c-38 12-79 37-109 66l46 8c-39 13-76 34-100 57-14 14-8 28 12 27 29-2 67-22 102-44" strokeWidth="9" />
        <path d="M218 74c65-26 143-43 188-39 16 2 17 8 6 19-27 28-76 50-130 63l-39 14-30-27z" strokeWidth="9" />
        <path d="M72 188c32-33 73-62 113-82M256 91c40-17 84-29 125-33-25 20-59 34-95 43" strokeWidth="5" />
      </g>
      <g fill="currentColor">
        <path d="M177 244c7-66 43-103 99-103 19 0 37 6 52 17l20-21c36 38 56 87 62 138 2 16-8 21-19 7l-31-39-76-19-47 18 79 26 38 91c-46 0-94-8-137-30-37-4-79-3-119 4 21-30 34-59 40-89 7 1 13 1 20 0l19 0z" />
        <path d="M149 159c-10 0-17 7-17 16 0 7 4 13 11 15l11 2 10-8-2-16-8-9zM331 85c-10 0-17 7-17 16 0 7 4 13 11 15l11 2 10-8-2-16-8-9z" />
        <path d="M143 161l18-19 4 4-13 22zM325 87l18-19 4 4-13 22z" />
        <circle cx="151" cy="168" r="4" />
        <circle cx="333" cy="94" r="4" />
      </g>
    </svg>
  )
}

function App() {
  return (
    <main className="welcome-screen">
      <section className="welcome-content" aria-labelledby="brand-name">
        <BrandMark />
        <div className="brand-copy">
          <h1 id="brand-name">AeroLuferan</h1>
          <p>Vigilancia aérea &amp; protección conectada</p>
        </div>
        <button className="start-button" type="button">
          Comenzar
        </button>
      </section>

      <footer className="app-footer">
        <p>© 2026</p>
        <p>Sistemas de vigilancia</p>
        <p>v2.4.0</p>
      </footer>
    </main>
  )
}

export default App
