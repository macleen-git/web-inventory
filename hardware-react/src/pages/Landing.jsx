import { useEffect, useState } from 'react'
import './Landing.css'

function Landing({ onLogin, onSignUp }) {
  const [openMenu, setOpenMenu] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)

  useEffect(() => {
    const handleInstallPrompt = event => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const handleInstalled = () => setInstallPrompt(null)
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  async function handleInstall() {
    if (!installPrompt) {
      window.alert('To install, open your browser menu and choose “Install app” or “Add to Home Screen” when available.')
      return
    }
    installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

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

  useEffect(() => {
    const page = document.querySelector('.landing-page')
    if (!page) return undefined

    const handleGearClick = event => {
      const gear = event.target.closest('.background-gear')
      if (!gear || !page.contains(gear)) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gear.classList.remove('gear-click-roll')
      void gear.offsetWidth
      gear.classList.add('gear-click-roll')
      window.setTimeout(() => gear.classList.remove('gear-click-roll'), 2300)
    }
    page.addEventListener('click', handleGearClick)
    return () => page.removeEventListener('click', handleGearClick)
  }, [])

  useEffect(() => {
    const page = document.querySelector('.landing-page')
    if (!page) return undefined

    const revealTargets = page.querySelectorAll(
      '.hero-section .col-lg-6, .about-section .store-visual, .about-section .col-lg-7, .feature-card, .inventory-section .col-lg-7, .inventory-visual, .cta-section .container, .landing-footer .row, .photo-tool, .mini-benefit, .section-heading'
    )

    revealTargets.forEach((element, index) => {
      element.classList.add('scroll-reveal')
      if (element.classList.contains('feature-card') || element.classList.contains('photo-tool')) {
        element.style.setProperty('--reveal-delay', `${(index % 4) * 130}ms`)
      }
    })

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (reducedMotion) {
      revealTargets.forEach(element => element.classList.add('is-visible'))
      return undefined
    }

    let observer

    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            entry.target.classList.toggle('is-visible', entry.isIntersecting)
          })
        },
        { threshold: 0.14, rootMargin: '0px 0px -45px 0px' }
      )

      revealTargets.forEach(element => observer.observe(element))
    } else {
      revealTargets.forEach(element => element.classList.add('is-visible'))
    }

    let frame = 0
    let scrollStopTimer
    const updateScrollMotion = () => {
      page.classList.add('is-scrolling')
      window.clearTimeout(scrollStopTimer)
      scrollStopTimer = window.setTimeout(() => page.classList.remove('is-scrolling'), 150)
      if (frame) window.cancelAnimationFrame(frame)

      frame = window.requestAnimationFrame(() => {
        const scrollY = window.scrollY || 0
        page.style.setProperty('--page-shift', `${scrollY * 0.16}px`)
        page.style.setProperty('--screw-rotation', `${scrollY * 1.35}deg`)
        page.style.setProperty('--screw-rotation-reverse', `${scrollY * -1.1}deg`)
        page.style.setProperty('--scroll-progress', `${(scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight)) * 100}%`)
      })
    }

    window.addEventListener('scroll', updateScrollMotion, { passive: true })
    updateScrollMotion()

    return () => {
      window.removeEventListener('scroll', updateScrollMotion)
      if (frame) window.cancelAnimationFrame(frame)
      window.clearTimeout(scrollStopTimer)
      observer?.disconnect()
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
      <div className="landing-scroll-progress" aria-hidden="true"><span /></div>
      <div className="floating-tool-particles" aria-hidden="true">
        <i className="bi bi-nut particle-one" /><i className="bi bi-gear-fill particle-two" /><i className="bi bi-hammer particle-three" /><i className="bi bi-wrench-adjustable particle-four" />
      </div>

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

        <button type="button" className="background-gear gear-large gear-hero-left" aria-label="Rotate background gear"><i className="bi bi-gear-fill" /></button>
        <button type="button" className="background-gear gear-small gear-hero-right" aria-label="Rotate background gear"><i className="bi bi-gear-fill" /></button>
        <button type="button" className="background-gear gear-medium gear-hero-bottom" aria-label="Rotate background gear"><i className="bi bi-gear-fill" /></button>

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
        <button type="button" className="background-gear gear-medium gear-about-left" aria-label="Rotate background gear"><i className="bi bi-gear-fill" /></button>
        <button type="button" className="background-gear gear-small gear-about-right" aria-label="Rotate background gear"><i className="bi bi-gear-fill" /></button>
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
        <button type="button" className="background-gear gear-small gear-features-left" aria-label="Rotate background gear"><i className="bi bi-gear-fill" /></button>
        <button type="button" className="background-gear gear-large gear-features-right" aria-label="Rotate background gear"><i className="bi bi-gear-fill" /></button>
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
        <button type="button" className="background-gear gear-large gear-inventory-left" aria-label="Rotate background gear"><i className="bi bi-gear-fill" /></button>
        <button type="button" className="background-gear gear-small gear-inventory-right" aria-label="Rotate background gear"><i className="bi bi-gear-fill" /></button>
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

      {/* INSTALL + CONTACT */}
      <section id="contact" className="cta-section landing-section">
        <button type="button" className="background-gear gear-small gear-contact-left" aria-label="Rotate background gear"><i className="bi bi-gear-fill" /></button>
        <button type="button" className="background-gear gear-medium gear-contact-right" aria-label="Rotate background gear"><i className="bi bi-gear-fill" /></button>
        <div className="container text-center">
          <div className="cta-logo"><span className="brand-icon"><i className="bi bi-gear-fill" /></span></div>
          <span className="section-kicker light">GET STARTED</span>
          <h2 className="light-title">Ready to Manage Your Inventory?</h2>
          <p>Install the Hardware Tools Inventory app for quick access from your device.</p>
          <div className="cta-actions">
            <button type="button" className="btn btn-signup btn-lg install-app-button" onClick={handleInstall}>
              <i className="bi bi-download me-2" aria-hidden="true" /> INSTALL APP
            </button>
          </div>
          <div className="landing-contact-panel">
            <span className="section-kicker light">CONTACT US</span>
            <h3>Need to get in touch?</h3>
            <p>Connect with us through Facebook or call our contact number.</p>
            <div className="landing-contact-actions">
              <a className="contact-action" href="https://web.facebook.com/macleen.quinton.fetalver.2024" target="_blank" rel="noopener noreferrer">
                <i className="bi bi-facebook" aria-hidden="true" /> Facebook Profile
              </a>
              <a className="contact-action" href="tel:09127413810">
                <i className="bi bi-telephone-fill" aria-hidden="true" /> 09127413810
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* DEMO LIVE SHOP ACTIVITY — VISUAL ONLY */}
      <section className="shop-activity-section" aria-label="Illustrative hardware shop activity">
        <div className="container">
          <div className="shop-activity-heading">
            <span className="section-kicker light">HARDWARE SHOP ACTIVITY</span>
            <h2>Inside a Busy Hardware Shop</h2>
            <p>Illustrative order activity for demonstration only.</p>
          </div>
        </div>
        <div className="order-ticker" aria-label="Animated sample order cards">
          <div className="order-ticker-track">
            {[0, 1].map(copy => (
              <div className="order-ticker-group" key={copy} aria-hidden={copy === 1}>
                {[
                  ['bi-hammer', 'Claw Hammer', 'New demo order'],
                  ['bi-tools', 'Power Drill', 'Sample purchase'],
                  ['bi-wrench-adjustable', 'Wrench Set', 'New demo order'],
                  ['bi-screwdriver', 'Screwdriver Set', 'Sample purchase'],
                  ['bi-nut', 'Fastener Pack', 'New demo order']
                ].map(([icon, product, status]) => (
                  <article className="order-demo-card" key={`${copy}-${product}`}>
                    <span className="order-demo-icon"><i className={`bi ${icon}`} /></span>
                    <span><strong>{product}</strong><small>{status}</small></span>
                    <span className="order-demo-dot" />
                  </article>
                ))}
              </div>
            ))}
          </div>
        </div>
        <p className="order-demo-disclaimer">DEMO ANIMATION · NOT CONNECTED TO REAL ORDERS</p>
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