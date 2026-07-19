// File: /public/js/partners.js

document.addEventListener("DOMContentLoaded", () => {
  const partnersList = [
    { name: "ISRO", image: "/images/partners/ISRO_Logo.svg", link: "#" },
    { name: "DRDO", image: "/images/partners/DRDO-logo.PNG", link: "#" },
    { name: "Telangana", image: "/images/partners/Emblem_of_Telangana.svg", link: "#" },
    { name: "IndianOil", image: "/images/partners/Indian_Oil_Logo.svg", link: "#" },
    { name: "HPCL", image: "/images/partners/Hindustan_Petroleum_logo.svg", link: "#" },
    { name: "BPCL", image: "/images/partners/Bharat_Petroleum_logo.svg", link: "#" },
    { name: "TCS", image: "/images/partners/Tata_Consultancy_Services_old_logo.svg", link: "#" },
    { name: "IndianRailways", image: "/images/partners/Indian-Railways-01.svg", link: "#" },
    { name: "Indianarmy", image: "/images/partners/Indian_Army.svg", link: "#" },
    { name: "AndhraPradesh", image: "/images/partners/Emblem_of_Andhra_Pradesh.svg", link: "#" },
    { name: "Amazon", image: "/images/partners/Amazon_logo.svg", link: "#" },
    { name: "BHEL", image: "/images/partners/BHEL_logo.svg", link: "#" },
    { name: "Google", image: "/images/partners/google-icon-logo.svg", link: "#" },
    { name: "wipro", image: "/images/partners/Wipro_Logo.svg", link: "#" },
    { name: "Deloitte", image: "/images/partners/Logo_of_Deloitte.svg", link: "#" },
    { name: "Infosys", image: "/images/partners/Infosys_logo.svg", link: "#" },
    { name: "Adani", image: "/images/partners/Adani_logo.svg", link: "#" },
    { name: "Novotel", image: "/images/partners/Logo_Novotel_Hotels.svg", link: "#" },
    { name: "ITC", image: "/images/partners/ITC_Hotels_logo.svg", link: "#" },
    { name: "JSW", image: "/images/partners/JSW_Group_logo.svg", link: "#" }
  ];

  const gridContainer = document.getElementById("emeraldPartnerGrid");
  if (!gridContainer) return; 

  let gridHTML = "";
  
  partnersList.forEach(partner => {
    const isLink = partner.link && partner.link !== "#";
    const innerContent = `<img src="${partner.image}" alt="${partner.name}" title="${partner.name}" loading="lazy" onerror="this.style.display='none';">`;
    
    // Updated to use reveal-item
    if (isLink) {
      gridHTML += `<a href="${partner.link}" target="_blank" rel="noopener noreferrer" class="ep-logo-item reveal-item">${innerContent}</a>`;
    } else {
      gridHTML += `<div class="ep-logo-item reveal-item">${innerContent}</div>`;
    }
  });

  // Inject the HTML into the DOM
  gridContainer.innerHTML = gridHTML;

  // Grab the elements using the updated class name
  const injectedReveals = gridContainer.querySelectorAll('.reveal-item');
  
  const appearOptions = {
      threshold: 0.15,
      rootMargin: "0px 0px -20px 0px"
  };

  const dynamicObserver = new IntersectionObserver(function(entries, observer) {
      entries.forEach(entry => {
          if (entry.isIntersecting) {
              // Ensure your CSS uses '.active' to trigger the final state
              entry.target.classList.add('active'); 
              observer.unobserve(entry.target);
          }
      });
  }, appearOptions);

  injectedReveals.forEach(reveal => {
      dynamicObserver.observe(reveal);
  });
});