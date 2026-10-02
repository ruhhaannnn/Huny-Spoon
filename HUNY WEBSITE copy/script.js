import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js"; 
import { getFirestore, collection, getDocs, addDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js"; 

const firebaseConfig = { 
    apiKey: "AIzaSyDFkaY_Xgmmj_H5UQsmY0yk6F_W7iBiBPk", 
    authDomain: "honey-in-spoon-ba23e.firebaseapp.com", 
    projectId: "honey-in-spoon-ba23e", 
    storageBucket: "honey-in-spoon-ba23e.firebasestorage.app", 
    messagingSenderId: "636734187263", 
    appId: "1:636734187263:web:486fb9c0023b0bb4b94eca" 
}; 

let app, db; 
if (firebaseConfig.apiKey) { 
    app = initializeApp(firebaseConfig); 
    db = getFirestore(app); 
} else { 
    console.warn("Firebase config is missing. Live data will not load."); 
} 

async function renderPurchaseSection() { 
    const container = document.getElementById('dynamic-products-container'); 
    if (!container || !db) return; 
    
    try { 
        const q = query(collection(db, "products"), orderBy("order", "asc")); 
        const querySnapshot = await getDocs(q); 
        
        let html = ''; 
        let schemaProducts = []; 
        
        querySnapshot.forEach((doc) => { 
            const prod = doc.data(); 
            
            schemaProducts.push({
                "@type": "Product",
                "name": prod.title,
                "description": prod.description || `Box of ${prod.itemsPerBox} Spoons of ${prod.title}`,
                "offers": {
                    "@type": "Offer",
                    "priceCurrency": "INR",
                    "price": prod.price,
                    "availability": prod.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                    "url": "https://www.honeyinspoon.com/#purchase"
                }
            });

            const btnHtml = prod.inStock  
                ? `<button class="btn-buy" onclick="purchaseViaEmail('${prod.title}', ${prod.price}, ${prod.itemsPerBox})" aria-label="Order ${prod.title}">Order Now</button>` 
                : `<button class="btn-soldout" disabled aria-label="${prod.title} Sold Out">Sold Out</button>`; 
                
            const discountBadge = prod.discount ? `<div class="discount-badge">${prod.discount}</div>` : ''; 
            const origPrice = prod.originalPrice ? `<span class="original-price">₹${prod.originalPrice}</span>` : ''; 
            const descHtml = prod.description ? `<p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 20px; line-height: 1.4;">${prod.description}</p>` : ''; 

            html += ` 
                <div class="purchase-card" style="display:flex; flex-direction:column;"> 
                    ${discountBadge} 
                    <h3 class="product-box-title">${prod.title}</h3> 
                    <p class="product-box-items">Box of ${prod.itemsPerBox} Spoons</p> 
                    ${descHtml} 
                    <div style="margin-top:auto;"> 
                        <div class="product-price">₹${prod.price} ${origPrice}</div> 
                        ${btnHtml} 
                    </div> 
                </div> 
            `; 
        }); 
        
        if(html !== '') container.innerHTML = html; 
        
        if(schemaProducts.length > 0) {
            const script = document.createElement('script');
            script.type = 'application/ld+json';
            script.text = JSON.stringify({
                "@context": "https://schema.org",
                "@type": "ItemList",
                "itemListElement": schemaProducts.map((p, index) => ({
                    "@type": "ListItem",
                    "position": index + 1,
                    "item": p
                }))
            });
            document.head.appendChild(script);
        }

    } catch (error) { 
        console.error("Error fetching products:", error); 
        container.innerHTML = `<p style="text-align:center; width:100%;">Currently updating our stock. Please check back in a few minutes.</p>`; 
    } 
} 

window.purchaseViaEmail = function(title, price, items) { 
    const email = "hunyinc@gmail.com";
    const subject = `Order Request: ${title}`;
    const message = `Hi! I would like to purchase the ${title} Honey Spoon Box (${items} items) priced at ₹${price}. Please let me know the availability and payment details.`; 
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`; 
    window.location.href = url;
} 

async function logCustomAnalytics() { 
    if (!db) return; 
    try { 
        let batteryLevel = "Unknown"; 
        if (navigator.getBattery) { 
            const battery = await navigator.getBattery(); 
            batteryLevel = Math.round(battery.level * 100) + "%"; 
        } 

        let deviceType = "Desktop / Laptop"; 
        if (/Android/i.test(navigator.userAgent)) deviceType = "Android Mobile"; 
        else if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) deviceType = "iOS Device"; 
        else if (/Mac/i.test(navigator.userAgent)) deviceType = "Mac OS"; 
        else if (/Windows/i.test(navigator.userAgent)) deviceType = "Windows PC"; 

        let networkInfo = "Unknown Connection"; 
        if (navigator.connection) { 
            networkInfo = navigator.connection.effectiveType ? navigator.connection.effectiveType.toUpperCase() : "Unknown"; 
        } 

        let ipAddress = 'Hidden'; 
        let city = 'Unknown'; 
        let region = 'Unknown'; 

        try { 
            const ipResponse = await fetch('https://ipapi.co/json/'); 
            const ipData = await ipResponse.json(); 
            if(ipData.ip) ipAddress = ipData.ip; 
            if(ipData.city) city = ipData.city; 
            if(ipData.region) region = ipData.region; 
        } catch (ipError) { 
            console.warn("IP Lookup bypassed."); 
        } 

        const analyticsData = { 
            timestamp: new Date().toISOString(), 
            ipAddress: ipAddress, 
            city: city, 
            region: region, 
            deviceBattery: batteryLevel, 
            deviceType: deviceType, 
            network: networkInfo, 
            userAgent: navigator.userAgent 
        }; 

        await addDoc(collection(db, "analytics_logs"), analyticsData); 
    } catch (error) { 
        console.error("Firestore insertion failed for analytics:", error); 
    } 
} 

async function fetchHeadlines() { 
    if (!db) return; 
    try { 
        const querySnapshot = await getDocs(collection(db, "headlines")); 
        let dynamicHTML = ""; 
        
        querySnapshot.forEach((doc) => { 
            dynamicHTML += `<span>${doc.data().text}</span><span class="dot">•</span>`; 
        }); 

        const tickerGroups = document.querySelectorAll('.ticker-group'); 
        if (tickerGroups.length > 0) { 
            tickerGroups.forEach(group => { 
                group.innerHTML = dynamicHTML === "" ? `<span>Stay tuned for updates...</span><span class="dot">•</span>` : dynamicHTML; 
            }); 
        } 
    } catch (error) { 
        console.error("Error loading headlines:", error); 
    } 
} 

async function fetchLiveWeather() { 
    const tempElement = document.getElementById('live-temp'); 
    const conditionElement = document.getElementById('live-cond'); 
    const iconContainer = document.getElementById('live-icon'); 

    const lat = 34.0837;  
    const lon = 74.7973; 

    try { 
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`); 
        const data = await response.json(); 

        if (data && data.current_weather) { 
            const temp = Math.round(data.current_weather.temperature); 
            const weatherCode = data.current_weather.weathercode; 
            
            let conditionText = "Clear"; 
            let svgIcon = `<svg width="17" height="17" viewBox="0 0 24 24" fill="#facc39" stroke="#facc39" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle></svg>`; 
            
            if (weatherCode >= 1 && weatherCode <= 3) { conditionText = "Cloudy"; svgIcon = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#86868b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>`; } 
            if (weatherCode >= 45 && weatherCode <= 48) conditionText = "Foggy"; 
            if (weatherCode >= 51 && weatherCode <= 67) { conditionText = "Raining"; svgIcon = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6a1b9a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path><path d="M12 21v1"></path></svg>`; } 
            if (weatherCode >= 71 && weatherCode <= 77) { conditionText = "Snowing"; svgIcon = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#82a8ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"></path><path d="M12 18h.01"></path></svg>`; } 
            
            if(tempElement) tempElement.textContent = `${temp}°C`; 
            if(conditionElement) conditionElement.textContent = conditionText; 
            if(iconContainer) iconContainer.innerHTML = svgIcon; 
        } 
    } catch (error) { console.error("Weather failed:", error); } 
} 

function initCounters() { 
    const counters = document.querySelectorAll('.counter'); 
    const speed = 150;  
    const animateCounters = () => { 
        counters.forEach(counter => { 
            const updateCount = () => { 
                const target = +counter.getAttribute('data-target'); 
                const count = +counter.innerText; 
                const inc = target / speed; 
                if (count < target) { counter.innerText = Math.ceil(count + inc); setTimeout(updateCount, 15); }  
                else { counter.innerText = target; } 
            }; 
            updateCount(); 
        }); 
    } 

    const observer = new IntersectionObserver((entries, observer) => { 
        entries.forEach(entry => { if (entry.isIntersecting) { animateCounters(); observer.disconnect(); }}); 
    }, { threshold: 0.5 }); 
    const statsSection = document.querySelector('.stats-section'); 
    if (statsSection) observer.observe(statsSection); 
} 

/**
 * HIGH-PERFORMANCE GPU-ACCELERATED SLIDER ENGINE
 */
function initPremiumMarquee(containerSelector, trackSelector, speed = 1) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const track = container.querySelector(trackSelector);
    if (!track) return;
    
    // Allows vertical page scrolling while capturing horizontal swipes
    container.style.touchAction = 'pan-y'; 
    container.style.cursor = 'grab';
    
    // Kill CSS animations to let JS Hardware Acceleration take over seamlessly
    track.style.animation = 'none';
    track.style.transition = 'none';
    track.style.width = 'max-content';
    
    let groupWidth = 0;
    const group = track.querySelector('.marquee-group');
    
    function updateWidth() {
        if (group) groupWidth = group.getBoundingClientRect().width;
    }
    
    // Only recalculate layout on screen rotate/resize to save CPU
    window.addEventListener('resize', updateWidth); 
    
    let currentX = 0;
    let isDragging = false;
    let startX = 0;
    let dragStartX = 0;

    function play() {
        // FIX: Because the site starts with display:none (launch screen), 
        // the initial width is 0. Keep checking until the site is visible!
        if (groupWidth <= 0) {
            updateWidth();
        }

        if (groupWidth > 0) {
            if (!isDragging) {
                currentX -= speed; // Autoplay left
            }
            
            // Perfect seamless mathematical loop check
            if (currentX <= -groupWidth) {
                currentX += groupWidth;
            } else if (currentX > 0) {
                currentX -= groupWidth;
            }
            
            // Render via GPU Composite Layer only (Zero CPU cost)
            track.style.transform = `translate3d(${currentX}px, 0, 0)`;
        }
        
        requestAnimationFrame(play);
    }

    // Universal Pointer Events (Supports Mouse, Touch, Stylus simultaneously)
    container.addEventListener('pointerdown', (e) => {
        isDragging = true;
        container.style.cursor = 'grabbing';
        startX = e.clientX;
        dragStartX = currentX;
        // Stop mouse text-selection, allow touch events to pass through
        if (e.pointerType === 'mouse') e.preventDefault(); 
    });
    
    window.addEventListener('pointerup', () => {
        isDragging = false;
        container.style.cursor = 'grab';
    });
    
    window.addEventListener('pointercancel', () => {
        isDragging = false;
        container.style.cursor = 'grab';
    });

    window.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - startX;
        currentX = dragStartX + deltaX;
    });

    // Make sure we update the width one last time after all images load
    window.addEventListener('load', updateWidth);

    // Start engine
    requestAnimationFrame(play);
}


document.addEventListener('DOMContentLoaded', () => { 
    fetchLiveWeather(); 
    fetchHeadlines(); 
    logCustomAnalytics(); 
    initCounters(); 
    renderPurchaseSection(); 
    
    // Initialize Premium Sliders with fractional GPU speed scaling
    initPremiumMarquee('.photo-slider-section .seamless-marquee-container', '.photo-track', 1);
    initPremiumMarquee('.testimonials-section .seamless-marquee-container', '.reviews-track', 0.8);

    const launchScreen = document.getElementById('launch-screen'); 
    const mainSite = document.getElementById('main-site'); 
    const hamburger = document.getElementById('hamburger'); 
    const menuOverlay = document.getElementById('menu-overlay'); 
    const liquidPill = document.querySelector('.liquid-pill'); 
    const overlayLinks = document.querySelectorAll('.overlay-links a'); 
    const landscapeHero = document.getElementById('landscape-hero-img'); 
    const contactBtn = document.getElementById('contactBtn'); 
    const contactInfo = document.querySelector('.contact-info'); 

    setTimeout(() => { 
        launchScreen.classList.add('slide-up'); 
        setTimeout(() => { 
            launchScreen.classList.add('hidden'); 
            mainSite.classList.remove('hidden'); 
            setTimeout(() => { mainSite.classList.add('visible'); }, 50); 
        }, 1200); 
    }, 2800); 

    if (contactBtn) { 
        contactBtn.addEventListener('click', (e) => { 
            if (window.innerWidth > 768) { e.preventDefault(); if(contactInfo) contactInfo.classList.toggle('expanded'); }  
            else { window.location.href = 'mailto:hunyinc@gmail.com'; } 
        }); 
    } 

    hamburger.addEventListener('click', () => { 
        hamburger.classList.toggle('active'); 
        menuOverlay.classList.toggle('active'); 
        const spans = hamburger.querySelectorAll('span'); 
        spans.forEach(span => span.style.background = hamburger.classList.contains('active') ? 'var(--honey-yellow)' : 'var(--text-main)'); 
    }); 

    overlayLinks.forEach(link => { 
        link.addEventListener('click', () => { hamburger.classList.remove('active'); menuOverlay.classList.remove('active'); hamburger.querySelectorAll('span').forEach(span => span.style.background = 'var(--text-main)'); }); 
    }); 

    let lastScrollY = window.scrollY; 
    let ticking = false; 

    window.addEventListener('scroll', () => { 
        lastScrollY = window.scrollY; 
        if (!ticking) { 
            window.requestAnimationFrame(() => { 
                if (lastScrollY > 50) { 
                    liquidPill.style.padding = '10px 15px 10px 20px'; liquidPill.style.background = 'rgba(255, 255, 255, 0.9)'; liquidPill.style.maxWidth = '100%'; liquidPill.style.borderRadius = '0px'; liquidPill.style.border = 'none'; liquidPill.style.borderBottom = '1px solid rgba(0, 0, 0, 0.05)'; 
                } else { 
                    liquidPill.style.padding = '8px 16px 8px 15px'; liquidPill.style.background = 'rgba(255, 255, 255, 0.45)'; liquidPill.style.maxWidth = '1200px'; liquidPill.style.borderRadius = '100px'; liquidPill.style.border = '1px solid rgba(0,0,0,0.05)'; 
                } 
                if (landscapeHero && lastScrollY <= window.innerHeight && window.innerWidth > 768) landscapeHero.style.transform = `scale(${1 + (lastScrollY * 0.0003)})`; 
                ticking = false; 
            }); 
            ticking = true; 
        } 
    }, { passive: true }); 
});