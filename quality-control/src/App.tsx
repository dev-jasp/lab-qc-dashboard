import './App.css';
import Header from './components/header/Header';
import LeveyJenningsChart from './components/mainContent/LeveyJenningsChart'
import ParticlesBackground from './components/visuals/ParticlesBackground';
import Footer from './components/header/Footer';


function App() {
  return (
    <div className="relative min-h-96 overflow-hidden">
      {/* Particle background */}
      <div className="absolute inset-0 -z-10">
        <ParticlesBackground
          particleColors={['#0e08a6', '#ffffff']}
          particleCount={200}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={100}
          moveParticlesOnHover={true}
          alphaParticles={false}
          disableRotation={false}
        />
      </div>
      <Header />
      <LeveyJenningsChart
        data={[]}
        mean={0}
        sd={1}
      />
      <Footer />
    </div>
  );
}

export default App;
