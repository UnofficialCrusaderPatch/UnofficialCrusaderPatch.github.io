export default function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg">
      <a className="navbar-logo" href="index.html">
        <img
          src="/src/assets/images/UCP3-Logo-groß.png"
          alt="Unofficial Crusader Patch"
          width="50"
          height="auto"
        />
      </a>
      <div>
        <ul className="nav-list">
          <li className="nav-item">
            <a className="nav-link" href="index.html">
              Home
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link" href="about.html">
              About
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link" href="getting-started.html">
              Getting Started
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link" href="features.html">
              Features
            </a>
          </li>
          <li className="nav-item">
            <a
              className="nav-link"
              href="https://github.com/UnofficialCrusaderPatch/UnofficialCrusaderPatch3/wiki"
              target="_blank"
              rel="noopener noreferrer"
            >
              UCP Wiki
            </a>
          </li>
          <li className="nav-item">
            <a
              href="https://discord.gg/anzCpnTGxY"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://discordapp.com/api/guilds/426318193603117057/widget.png?style=shield"
                alt="Join our Discord server"
                width="50"
                height="auto"
              />
            </a>
          </li>
          <li className="nav-item github-item">
            <a
              href="https://github.com/UnofficialCrusaderPatch/UnofficialCrusaderPatch"
              rel="noopener noreferrer"
              aria-label="GitHub repository"
            >
              <i className="fab fa-github"></i>
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
