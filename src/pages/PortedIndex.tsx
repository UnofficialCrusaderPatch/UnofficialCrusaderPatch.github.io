import "../styles.css";

export function Index() {
  return (
    <div className="container-fluid page">
      {/* <nav className="navbar navbar-expand-lg">
        <a className="navbar-brand" href="index.html">
          <img src="assets/img/icon6.ico" />
        </a>
        <button
          className="navbar-toggler"
          type="button"
          data-toggle="collapse"
          data-target="#navbarSupportedContent"
          aria-controls="navbarSupportedContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <ul className="navbar-nav mr-auto">
            <li className="nav-item active">
              <a className="nav-link" href="index.html">
                Home <span className="sr-only">(current)</span>
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
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle"
                id="navbarDropdown"
                role="button"
                data-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
              >
                AI Character Introduction
              </a>
              <div className="dropdown-menu" aria-labelledby="navbarDropdown">
                <a className="dropdown-item" href="aic/overview.html">
                  Overview
                </a>
                <div className="dropdown-divider"></div>
                <a className="dropdown-item" href="aic/detailed.html">
                  AI Personality Values
                </a>
                <a className="dropdown-item" href="aic/field-values.html">
                  AIC Field Values
                </a>
              </div>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="aiv.html">
                AI Castle Introduction
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="contributing.html">
                Contributing
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="faq.html">
                FAQ
              </a>
            </li>
            <li className="nav-link">
              <a href="https://discord.gg/anzCpnTGxY">
                <img src="https://discordapp.com/api/guilds/426318193603117057/widget.png?style=shield" />
              </a>
            </li>
            <li className="nav-link">
              <a href="https://github.com/UnofficialCrusaderPatch/UnofficialCrusaderPatch">
                <i className="fab fa-github"> </i>
              </a>
            </li>
          </ul>
        </div>
      </nav> */}

      <div id="content" className="row">
        <div className="col-lg-6 feature-highlights">
          <h3>Feature Highlights</h3>
          <div id="accordion">
            <div className="card feature">
              <div
                className="card-header"
                id="feature-one"
                data-toggle="collapse"
                data-target="#collapseOne"
                aria-expanded="true"
                aria-controls="collapseOne"
              >
                <h5 className="mb-0">
                  <button className="btn btn-link">
                    <i className="fas fa-bug"></i> Improve attack waves
                  </button>
                </h5>
              </div>

              <div
                id="collapseOne"
                className="collapse"
                aria-labelledby="feature-one"
                data-parent="#accordion"
              >
                <div className="card-body feature-highlight">
                  Lets AI attack units target civil and fortification buildings,
                  as well as wall parts which are already being attacked by one
                  unit. Also lets AI send more troops to attack enemy lord once
                  a breach is detected.
                </div>
              </div>
            </div>
            <div className="card feature">
              <div
                className="card-header"
                id="feature-two"
                data-toggle="collapse"
                data-target="#collapseTwo"
                aria-expanded="false"
                aria-controls="collapseTwo"
              >
                <h5 className="mb-0">
                  <button className="btn btn-link collapsed">
                    <i className="fas fa-shield-alt"></i> No AI demolishing of
                    inaccessible buildings
                  </button>
                </h5>
              </div>
              <div
                id="collapseTwo"
                className="collapse"
                aria-labelledby="feature-two"
                data-parent="#accordion"
              >
                <div className="card-body feature-highlight">
                  Prevents the AI from demolishing buildings when it has no
                  access. This stops AI from continuously demolishing and
                  rebuilding buildings where it has no access point.
                </div>
              </div>
            </div>
            <div className="card feature">
              <div
                className="card-header"
                id="feature-three"
                data-toggle="collapse"
                data-target="#collapseThree"
                aria-expanded="false"
                aria-controls="collapseThree"
              >
                <h5 className="mb-0">
                  <button className="btn btn-link collapsed">
                    <i className="fas fa-shield-alt"></i> Fix reinforcement of
                    defense troops
                  </button>
                </h5>
              </div>
              <div
                id="collapseThree"
                className="collapse"
                aria-labelledby="feature-three"
                data-parent="#accordion"
              >
                <div className="card-body feature-highlight">
                  Fixes bug where AI fails to reinforce missing troops on walls
                  and/or towers when defensive patrols are still active.
                  Probability for AIs to recruit defensive troops is increased
                  (from zero for some AIs).
                </div>
              </div>
            </div>
            <div className="card feature">
              <div
                className="card-header"
                id="feature-four"
                data-toggle="collapse"
                data-target="#collapseFour"
                aria-expanded="false"
                aria-controls="collapseFour"
              >
                <h5 className="mb-0">
                  <button className="btn btn-link collapsed">
                    <i className="fas fa-tachometer-alt"></i> Quicker gate
                    responsiveness
                  </button>
                </h5>
              </div>
              <div
                id="collapseFour"
                className="collapse"
                aria-labelledby="feature-four"
                data-parent="#accordion"
              >
                <div className="card-body feature-highlight">
                  Gates close later when enemies in range, and open faster when
                  danger is gone. Enemy distance for gate to close is reduced
                  from 200 to 140. Delay for opening gate when enemy is no
                  longer present is reduced from 1200 to 100.
                </div>
              </div>
            </div>
            <div className="card feature">
              <div className="card-header" id="feature-list-link">
                <h5 className="mb-0">
                  <a
                    id="features-link"
                    className="btn btn-link collapsed"
                    href="features.html"
                  >
                    <i className="fas fa-list-ul"></i> View full descriptions of
                    all features
                  </a>
                </h5>
              </div>
            </div>
          </div>

          <div id="changelog">
            <div className="col-lg-11">
              <h3>Changelog</h3>
              <div className="card-body">
                We've made changes and improvements to how some parts of the
                patcher work internally to make the process{" "}
                <b>more convenient and reliable</b> for you. We hope this will
                make it a more enjoyable experience. Feel free to contribute or
                suggest ideas on{" "}
                <a href="https://github.com/UnofficialCrusaderPatch/UnofficialCrusaderPatch">
                  GitHub
                </a>{" "}
                or join the{" "}
                <a href="https://discord.gg/vmy7CBR">
                  official UCP discord server
                </a>
              </div>
            </div>

            <div id="change-accordion">
              <div className="card feature">
                <div
                  className="card-header"
                  id="change-three"
                  data-toggle="collapse"
                  data-target="#changeThree"
                  aria-expanded="true"
                  aria-controls="changeThree"
                >
                  <h5 className="mb-0">
                    <button className="btn btn-link">
                      <i className="fas fa-star"></i>
                      New Features and Improvements
                    </button>
                  </h5>
                </div>

                <div
                  id="changeThree"
                  className="collapse"
                  aria-labelledby="change-three"
                  data-parent="#change-accordion"
                >
                  <div className="card-body feature-highlight">
                    <ul>
                      <li>
                        In the new <b>StartTroops</b> tab, you will be able to
                        select a starting unit configuration for all AI Lords as
                        well as your Crusader or European Lord
                      </li>
                      <li>
                        In the new <b>StartGoods</b> tab, you will be able to
                        select a starting resource configuration that will apply
                        for yourself and all other human or AI players.
                      </li>
                      <li>
                        You are able to now load AIV sets into the patcher by
                        creating a subfolder with the name of your AIV set
                        inside the <code>resources\aiv</code> folder
                      </li>
                      <li>
                        If you select multiple AICs that have the same
                        characters defined, the one you select first will be
                        given priority and the other ones will show a warning
                        indicating which AI Character definitions will not be
                        used
                      </li>
                      <li>
                        The format of AIC files has changed - the patcher is now
                        using a JSON format with <code>.json</code> file
                        extension
                      </li>
                    </ul>
                    <a href="assets/doc/changelog.html" target="_blank">
                      View full changelog here
                    </a>
                  </div>
                </div>
              </div>

              <div className="card feature">
                <div
                  className="card-header"
                  id="change-one"
                  data-toggle="collapse"
                  data-target="#changeOne"
                  aria-expanded="true"
                  aria-controls="changeOne"
                >
                  <h5 className="mb-0">
                    <button className="btn btn-link">
                      <i className="fas fa-random"></i>
                      Changes to the Patcher
                    </button>
                  </h5>
                </div>

                <div
                  id="changeOne"
                  className="collapse"
                  aria-labelledby="change-one"
                  data-parent="#change-accordion"
                >
                  <div className="card-body feature-highlight">
                    <ul>
                      <li>
                        AIC files no longer go into an <code>aic</code>{" "}
                        subfolder inside your Stronghold Crusader installation
                        directory
                      </li>
                      <li>
                        In this version, the Unofficial Crusader Patch comes
                        with a new folder structure. All content files
                        (including AIC and AIV files) that are to be
                        used/installed by the patcher go into a{" "}
                        <code>resources\&lt;config type&gt;</code> subfolder
                        inside the patcher directory. For example your AIC files
                        will go into the <code>resources\aic</code> folder
                      </li>
                      <li>
                        AIC files are now in JSON format and with{" "}
                        <code>.json</code> file extension. Old AIC files can be
                        converted by the patcher
                      </li>
                      <li>
                        AIC and AIV sets bundled with the UCP have been updated
                        to the newest versions
                      </li>
                      <li>
                        It is now again possible to select multiple AICs for
                        installation at once
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="card feature">
                <div
                  className="card-header"
                  id="change-two"
                  data-toggle="collapse"
                  data-target="#changeTwo"
                  aria-expanded="true"
                  aria-controls="changeTwo"
                >
                  <h5 className="mb-0">
                    <button className="btn btn-link">
                      <i className="fas fa-users"></i>
                      Using the Patcher
                    </button>
                  </h5>
                </div>

                <div
                  id="changeTwo"
                  className="collapse"
                  aria-labelledby="change-two"
                  data-parent="#change-accordion"
                >
                  <div className="card-body feature-highlight">
                    <h4>Language support</h4>
                    <ul>
                      <li>
                        An issue where sharing <code>ucp.cfg</code> (config)
                        files between persons with different locales would cause
                        crashes or otherwise not work properly has been
                        resolved. Please note that any decimal values in the
                        ucp.cfg must now use a dot (.) as the decimal separator
                        to be interpreted correctly
                      </li>
                      <li>
                        Translations for Chinese and Hungarian have been added
                      </li>
                    </ul>

                    <h4>Installation</h4>
                    <ul>
                      <li>
                        There is now a <b>command line tool</b> that can be used
                        for quicker or custom installation (see{" "}
                        <a href="(https://UnofficialCrusaderPatch.github.io/UnofficialCrusaderPatch/getting-started.html">
                          installation steps
                        </a>{" "}
                        for details)
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
