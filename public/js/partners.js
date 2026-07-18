// File: /public/js/partners.js

document.addEventListener("DOMContentLoaded", () => {
  const partnersList = [
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

    
 
  ];

  const gridContainer = document.getElementById("emeraldPartnerGrid");
  if (!gridContainer) return; 

  let gridHTML = "";
  
  partnersList.forEach(partner => {
    const isLink = partner.link && partner.link !== "#";
    const innerContent = `<img src="${partner.image}" alt="${partner.name}" title="${partner.name}" loading="lazy" onerror="this.style.display='none';">`;
    
    if (isLink) {
      gridHTML += `<a href="${partner.link}" target="_blank" rel="noopener noreferrer" class="ep-logo-item">${innerContent}</a>`;
    } else {
      gridHTML += `<div class="ep-logo-item">${innerContent}</div>`;
    }
  });

  gridContainer.innerHTML = gridHTML;
});