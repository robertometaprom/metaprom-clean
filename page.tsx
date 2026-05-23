export default function Home() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#0b1020",
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      padding: "40px",
      textAlign: "center"
    }}>
      <h1 style={{fontSize: "64px", marginBottom: "20px"}}>
        Metaprom
      </h1>

      <p style={{fontSize: "28px", maxWidth: "900px", lineHeight: 1.5}}>
        Describe your product. Metaprom AI creates the campaign.
      </p>

      <button style={{
        marginTop: "40px",
        padding: "18px 36px",
        borderRadius: "18px",
        border: "none",
        background: "linear-gradient(90deg,#7c3aed,#2563eb)",
        color: "white",
        fontSize: "20px",
        cursor: "pointer"
      }}>
        Generate Campaign
      </button>
    </main>
  )
}
