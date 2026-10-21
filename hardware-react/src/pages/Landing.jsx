import { useEffect, useState } from 'react'
import './Landing.css'

function Landing({ onLogin, onSignUp }) {
  const [openMenu, setOpenMenu] = useState(false)

  useEffect(() => {
    const existingLink = document.querySelector(
      'link[data-bootstrap-icons="landing"]'
    )

    if (!existingLink) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href =
        'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css'
      link.dataset.bootstrapIcons = 'landing'
      document.head.appendChild(link)
    }
  }, [])

  function scrollToSection(id) {
    setOpenMenu(false)

    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  }

  function goToTop() {
    setOpenMenu(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleLogin() {
    setOpenMenu(false)
    onLogin?.()
  }

  function handleSignUp() {
    setOpenMenu(false)
    onSignUp?.()
  }

  const features = [
    {
      icon: 'bi-tools',
      title: 'Tool Inventory',
      text: 'Keep a complete record of your hardware tools and products, including names, categories, quantities, and other important information.'
    },
    {
      icon: 'bi-box-seam',
      title: 'Stock Monitoring',
      text: 'Easily monitor the number of available items and identify products that are running low.'
    },
    {
      icon: 'bi-grid',
      title: 'Product Organization',
      text: 'Organize hardware tools according to their categories, making it easier to find and manage specific products.'
    },
    {
      icon: 'bi-clipboard-data',
      title: 'Inventory Records',
      text: 'Maintain accurate and organized records of your hardware products for easier inventory management.'
    }
  ]

  const benefits = [
    {
      number: '01',
      title: 'Organized',
      text: 'Keep inventory information in one place.'
    },
    {
      number: '02',
      title: 'Efficient',
      text: 'Reduce manual checking and recording.'
    },
    {
      number: '03',
      title: 'Easy to Manage',
      text: 'Update products and stock with ease.'
    },
    {
      number: '04',
      title: 'Reliable Records',
      text: 'Maintain accurate inventory data.'
    }
  ]

  const navItems = [
    { label: 'HOME', action: goToTop },
    { label: 'ABOUT US', action: () => scrollToSection('about') },
    { label: 'FEATURES', action: () => scrollToSection('features') },
    { label: 'INVENTORY', action: () => scrollToSection('inventory') },
    { label: 'CONTACT', action: () => scrollToSection('contact') }
  ]

  function Brand() {
    return (
      <>
        <span className="brand-icon" aria-hidden="true">
          <i className="bi bi-gear-fill" />
        </span>

        <span className="brand-text">
          <strong className="text-white">HARDWARE TOOLS</strong>
          <small>INVENTORY</small>
        </span>
      </>
    )
  }

  return (
    <div className="landing-page">

      {/* NAVBAR */}
      <nav className="navbar navbar-expand-lg landing-navbar sticky-top">
        <div className="container landing-nav-container">

          <button
            type="button"
            className="navbar-brand brand-mark border-0 bg-transparent p-0"
            onClick={goToTop}
            aria-label="Hardware Tools Inventory home"
          >
            <Brand />
          </button>

          <button
            className="navbar-toggler border-0 shadow-none"
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={openMenu}
            onClick={() => setOpenMenu(value => !value)}
          >
            <span
              className={`landing-toggler ${openMenu ? 'is-open' : ''}`}
            />
          </button>

          <div
            className={`landing-nav-collapse ${openMenu ? 'show' : ''}`}
          >
            <ul className="navbar-nav landing-nav-links">
              {navItems.map((item, index) => (
                <li className="nav-item" key={item.label}>
                  <button
                    type="button"
                    className={`nav-link ${index === 0 ? 'active' : ''}`}
                    onClick={item.action}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>

            <div className="landing-nav-actions">
              <button
                type="button"
                className="btn btn-login"
                onClick={handleLogin}
              >
                LOG IN
              </button>

              <button
                type="button"
                className="btn btn-signup"
                onClick={handleSignUp}
              >
                SIGN UP
              </button>
            </div>
          </div>

        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="hero-section" id="home">

        <div className="hero-gear gear-one" aria-hidden="true">
          <i className="bi bi-gear-fill" />
        </div>

        <div className="hero-gear gear-two" aria-hidden="true">
          <i className="bi bi-gear-fill" />
        </div>

        <div className="container hero-container">
          <div className="row align-items-center g-5">

            <div className="col-lg-6">

              <span className="eyebrow">
                HARDWARE TOOLS INVENTORY SYSTEM
              </span>

              <h1>
                MANAGE YOUR TOOLS.
                <br />
                <span>BUILD YOUR BUSINESS.</span>
              </h1>

              <p className="hero-lead">
                A simple and reliable way to manage your hardware tools inventory.
              </p>

              <p className="hero-copy">
                Keep track of your hardware tools, monitor available stocks,
                and organize your inventory in one convenient system. Designed
                to make inventory management easier, faster, and more organized.
              </p>

              <div className="hero-actions">
                <button
                  type="button"
                  className="btn btn-hero-primary"
                  onClick={handleLogin}
                >
                  <i
                    className="bi bi-box-arrow-in-right me-2"
                    aria-hidden="true"
                  />
                  LOG IN
                </button>

                <button
                  type="button"
                  className="btn btn-hero-outline"
                  onClick={handleSignUp}
                >
                  <i
                    className="bi bi-person-plus me-2"
                    aria-hidden="true"
                  />
                  SIGN UP
                </button>
              </div>

              <div className="tool-strip" aria-hidden="true">
                <span><i className="bi bi-hammer" /></span>
                <span><i className="bi bi-tools" /></span>
                <span><i className="bi bi-wrench-adjustable" /></span>
                <span><i className="bi bi-rulers" /></span>
              </div>

            </div>

            <div className="col-lg-6">
              <div className="hero-photo-wrap">
                <div className="hero-photo">

                  <div className="photo-content">

                    <div className="photo-badge">
                      <i className="bi bi-gear-fill" aria-hidden="true" />
                    </div>

                    <div className="photo-tools-grid">
                      {[
                        ['bi-hammer', 'HAND TOOLS'],
                        ['bi-wrench-adjustable', 'WRENCHES'],
                        ['bi-tools', 'TOOL SETS'],
                        ['bi-box-seam', 'SUPPLIES']
                      ].map(([icon, label]) => (
                        <div className="photo-tool" key={label}>
                          <i
                            className={`bi ${icon}`}
                            aria-hidden="true"
                          />
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="photo-label">
                      TOOLS
                      <small>READY TO WORK</small>
                    </div>

                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* ABOUT US */}
      <section id="about" className="about-section landing-section">
        <div className="container">
          <div className="row align-items-center g-5">

            <div className="col-lg-5">

              <div className="store-visual">

                <div className="store-visual-header">
                  <span className="brand-icon">
                    <i className="bi bi-gear-fill" />
                  </span>

                  <div>
                    <strong>HARDWARE TOOLS</strong>
                    <small>INVENTORY SYSTEM</small>
                  </div>
                </div>

                {[
                  ['bi-hammer', 'bi-wrench-adjustable', 'bi-tools', 'bi-nut'],
                  ['bi-box-seam', 'bi-rulers', 'bi-gear', 'bi-boxes'],
                  ['bi-hammer', 'bi-tools', 'bi-wrench', 'bi-box-seam']
                ].map((row, index) => (
                  <div className="shelf-row" key={index}>
                    {row.map((icon, iconIndex) => (
                      <span key={`${icon}-${iconIndex}`}>
                        <i
                          className={`bi ${icon}`}
                          aria-hidden="true"
                        />
                      </span>
                    ))}
                  </div>
                ))}

                <div className="visual-caption">
                  HARDWARE <b>INVENTORY</b>
                </div>

              </div>

            </div>

            <div className="col-lg-7">

              <span className="section-kicker">ABOUT US</span>

              <h2>
                Everything You Need to Manage Your Inventory
              </h2>

              <p>
                The Hardware Tools Inventory System is designed to help
                businesses efficiently manage and monitor their hardware tools
                and supplies.
              </p>

              <p>
                Instead of manually checking records, the system allows users
                to keep important inventory information organized in one place.
                It helps you know which tools are available, which products are
                running low, and which items need to be updated.
              </p>

              <div className="about-highlight">
                <i
                  className="bi bi-check-circle-fill"
                  aria-hidden="true"
                />
                <span>
                  A more organized, efficient, and reliable way to manage your
                  hardware inventory.
                </span>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="features-section landing-section">
        <div className="container">

          <div className="section-heading text-center">
            <span className="section-kicker light">
              WHAT CAN YOU MANAGE?
            </span>

            <h2 className="light-title">
              Powerful Inventory Features
            </h2>

            <p>
              Everything you need to keep your hardware inventory organized.
            </p>
          </div>

          <div className="row g-4">
            {features.map((feature, index) => (
              <div className="col-12 col-md-6 col-lg-3" key={feature.title}>

                <article className="feature-card h-100">

                  <div className="feature-number">
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  <div className="feature-icon">
                    <i
                      className={`bi ${feature.icon}`}
                      aria-hidden="true"
                    />
                  </div>

                  <h3>{feature.title}</h3>

                  <p>{feature.text}</p>

                  <div className="feature-bottom-line" />

                </article>

              </div>
            ))}
          </div>

        </div>
      </section>

      {/* INVENTORY MANAGEMENT */}
      <section id="inventory" className="inventory-section landing-section">
        <div className="container">
          <div className="row g-5 align-items-center">

            <div className="col-lg-7">

              <span className="section-kicker">
                INVENTORY MANAGEMENT
              </span>

              <h2>
                From Hand Tools to Construction Supplies
              </h2>

              <p>
                Whether you manage a small hardware store or a larger
                inventory, an organized system helps you keep product
                information and stock quantities easy to monitor.
              </p>

              <div className="row g-3 mt-3">
                {benefits.map(item => (
                  <div className="col-sm-6" key={item.number}>
                    <div className="mini-benefit">

                      <b>{item.number}</b>

                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.text}</small>
                      </span>

                    </div>
                  </div>
                ))}
              </div>

            </div>

            <div className="col-lg-5">

              <div className="inventory-visual">

                <div className="inventory-visual-top">
                  <span className="brand-icon">
                    <i className="bi bi-gear-fill" />
                  </span>

                  <div>
                    <strong>TOOL COLLECTION</strong>
                    <small>BUILT FOR ORGANIZATION</small>
                  </div>
                </div>

                <div className="inventory-visual-grid">
                  {[
                    ['bi-hammer', 'Hand Tools'],
                    ['bi-wrench-adjustable', 'Wrenches'],
                    ['bi-tools', 'Tool Sets'],
                    ['bi-nut', 'Hardware'],
                    ['bi-box-seam', 'Supplies'],
                    ['bi-boxes', 'Stock Items']
                  ].map(([icon, label]) => (
                    <div key={label}>
                      <i
                        className={`bi ${icon}`}
                        aria-hidden="true"
                      />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>

                <div className="inventory-visual-footer">
                  <i
                    className="bi bi-check-circle-fill"
                    aria-hidden="true"
                  />
                  <span>ORGANIZED. TRACKED. READY.</span>
                </div>

              </div>

            </div>

          </div>
        </div>
      </section>

      {/* CONTACT / GET STARTED */}
      <section id="contact" className="cta-section landing-section">
        <div className="container text-center">

          <div className="cta-logo">
            <span className="brand-icon">
              <i className="bi bi-gear-fill" />
            </span>
          </div>

          <span className="section-kicker light">
            GET STARTED
          </span>

          <h2 className="light-title">
            Ready to Manage Your Inventory?
          </h2>

          <p>
            Take control of your hardware tools inventory today.
            <br className="d-none d-md-block" />
            Create an account or log in to start managing your products and inventory.
          </p>

          <div className="cta-actions">

            <button
              type="button"
              className="btn btn-signup btn-lg"
              onClick={handleSignUp}
            >
              <i
                className="bi bi-person-plus me-2"
                aria-hidden="true"
              />
              SIGN UP
            </button>

            <span className="login-prompt">
              Already have an account?{' '}
              <button type="button" onClick={handleLogin}>
                LOG IN
              </button>
            </span>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="container">

          <div className="row align-items-center g-4">

            <div className="col-md-5">
              <button
                type="button"
                className="brand-mark border-0 bg-transparent p-0"
                onClick={goToTop}
                aria-label="Back to top"
              >
                <Brand />
              </button>
            </div>

            <div className="col-md-7">
              <div className="footer-nav">
                {navItems.map(item => (
                  <button
                    type="button"
                    key={item.label}
                    onClick={item.action}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          <hr />

          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} Hardware Tools Inventory.
              All rights reserved.
            </span>

            <span>
              Better Inventory. Smoother Operations.
            </span>
          </div>

        </div>
      </footer>

    </div>
  )
}

export default Landing