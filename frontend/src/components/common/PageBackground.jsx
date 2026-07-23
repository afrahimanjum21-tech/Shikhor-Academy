export default function PageBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-[#F7FBFF] via-[#ecf3fe] to-[#D9ECFF]" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-[800px] h-[800px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(61,132,255,0.15) 0%, rgba(61,132,255,0.05) 40%, transparent 70%)",
            filter: "blur(180px)",
          }}
        />
      </div>

      <div className="absolute inset-0 overflow-hidden">
        <svg className="absolute -top-20 -right-20 w-[600px] h-[600px] opacity-[0.15]" viewBox="0 0 600 600" fill="none">
          <path d="M600 0C500 50 400 150 350 250C300 350 250 400 200 500C150 600 100 650 50 700L0 700L0 0H600Z" fill="#3D84FF" />
        </svg>
        <svg className="absolute -bottom-40 -left-20 w-[700px] h-[700px] opacity-[0.12]" viewBox="0 0 700 700" fill="none">
          <path d="M0 700C100 650 200 550 300 450C400 350 450 300 500 200C550 100 600 50 650 0L700 0L700 700H0Z" fill="#3D84FF" />
        </svg>
        <svg className="absolute top-1/3 -right-32 w-[400px] h-[500px] opacity-[0.10]" viewBox="0 0 400 500" fill="none">
          <path d="M400 0C350 80 300 180 250 250C200 320 150 380 100 450C50 520 25 560 0 600V0H400Z" fill="#3D84FF" />
        </svg>
      </div>

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[10%] right-[15%] w-[300px] h-[300px] rounded-full bg-gradient-to-br from-[#3D84FF]/[0.08] to-transparent blur-[100px]" />
        <div className="absolute bottom-[20%] left-[10%] w-[250px] h-[250px] rounded-full bg-gradient-to-tr from-[#3D84FF]/[0.06] to-transparent blur-[80px]" />
        <div className="absolute top-[40%] left-[50%] w-[200px] h-[200px] rounded-full bg-gradient-to-r from-[#3D84FF]/[0.05] to-transparent blur-[60px]" />
        <div className="absolute top-[5%] left-[30%] w-[180px] h-[180px] rounded-full bg-gradient-to-bl from-[#3D84FF]/[0.07] to-transparent blur-[70px]" />
        <div className="absolute bottom-[10%] right-[25%] w-[220px] h-[220px] rounded-full bg-gradient-to-tl from-[#3D84FF]/[0.04] to-transparent blur-[90px]" />
      </div>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[300px]">
        <div className="w-full h-full" style={{
          background: "radial-gradient(ellipse at center top, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.2) 40%, transparent 70%)",
        }} />
      </div>
    </div>
  );
}
