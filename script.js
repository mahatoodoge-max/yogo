/* ===================================================================
   Riverbend Yoga Studio — script.js
   Touchstone 4: Interactivity and Client-Side Data

   Feature: "My Saved Classes" interest tracker.
     - On services.html, visitors can click "Add to My Interests" next
       to any class type or the monthly workshop.
     - Selections are stored in localStorage as an array of objects so
       they persist across visits and across pages.
     - On events.html, the most recently saved interest is used to
       pre-select the "Class or Event Interest" field on the request
       form, saving the visitor a step.

   Storage key: "riverbendSavedInterests" -> JSON array of
     { id, name, addedAt } objects.
   =================================================================== */

const STORAGE_KEY = "riverbendSavedInterests";

/* Catalog of classes/events a visitor can save. An array of objects
   used to build the "Add to My Interests" buttons and to look up a
   readable name from an id. */
const classCatalog = [
  { id: "gentle", name: "Gentle Flow" },
  { id: "vinyasa", name: "Vinyasa" },
  { id: "restorative", name: "Restorative" },
  { id: "workshop", name: "Monthly Workshop" }
];

/* -------------------- localStorage helpers -------------------- */

function getSavedInterests() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function setSavedInterests(interests) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(interests));
}

function addInterest(id, name) {
  const interests = getSavedInterests();
  const alreadySaved = interests.some(function (item) {
    return item.id === id;
  });
  if (!alreadySaved) {
    interests.push({ id: id, name: name, addedAt: new Date().toISOString() });
    setSavedInterests(interests);
  }
  return interests;
}

function removeInterest(id) {
  const interests = getSavedInterests().filter(function (item) {
    return item.id !== id;
  });
  setSavedInterests(interests);
  return interests;
}

/* ===================================================================
   services.html — "My Saved Classes" feature
   =================================================================== */

function renderSavedInterests() {
  const listEl = document.getElementById("saved-interests-list");
  const emptyEl = document.getElementById("saved-interests-empty");
  if (!listEl || !emptyEl) return;

  const interests = getSavedInterests();
  listEl.innerHTML = "";

  if (interests.length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  interests.forEach(function (item) {
    const li = document.createElement("li");
    li.className = "saved-interest-item";

    const label = document.createElement("span");
    label.textContent = item.name;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-interest-btn";
    removeBtn.textContent = "Remove";
    removeBtn.setAttribute("aria-label", "Remove " + item.name + " from my saved classes");
    removeBtn.addEventListener("click", function () {
      removeInterest(item.id);
      renderSavedInterests();
      syncAddButtons();
    });

    li.appendChild(label);
    li.appendChild(removeBtn);
    listEl.appendChild(li);
  });
}

/* Keeps each "Add to My Interests" button in sync with saved state,
   so a class already saved shows as added instead of inviting a
   duplicate click. */
function syncAddButtons() {
  const interests = getSavedInterests();
  const buttons = document.querySelectorAll(".add-interest-btn");
  buttons.forEach(function (btn) {
    const id = btn.dataset.classId;
    const isSaved = interests.some(function (item) {
      return item.id === id;
    });
    btn.textContent = isSaved ? "Added \u2713" : "Add to My Interests";
    btn.disabled = isSaved;
    btn.classList.toggle("is-saved", isSaved);
  });
}

function initServicesPage() {
  const addButtons = document.querySelectorAll(".add-interest-btn");
  if (addButtons.length === 0) return; // not on services.html

  addButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const id = btn.dataset.classId;
      const name = btn.dataset.className;
      addInterest(id, name);
      renderSavedInterests();
      syncAddButtons();
    });
  });

  renderSavedInterests();
  syncAddButtons();
}

/* ===================================================================
   events.html — pre-fill from storage + form validation
   =================================================================== */

function prefillInterestField() {
  const interestSelect = document.getElementById("interest");
  const banner = document.getElementById("returning-visitor-banner");
  if (!interestSelect) return; // not on events.html

  const interests = getSavedInterests();
  if (interests.length === 0) return;

  const mostRecent = interests[interests.length - 1];
  const optionExists = Array.from(interestSelect.options).some(function (opt) {
    return opt.value === mostRecent.id;
  });

  if (optionExists) {
    interestSelect.value = mostRecent.id;
    if (banner) {
      banner.textContent =
        'Welcome back! We pre-selected "' + mostRecent.name + '" based on a class you saved on our Services page.';
      banner.hidden = false;
    }
  }
}

/* Validation rules live in one object so it is easy to see what is
   being checked and to extend later. Each field maps to a function
   that returns an error message string, or an empty string when the
   field is valid. */
const validationRules = {
  name: function (value) {
    if (value.trim().length === 0) {
      return "Please enter your full name.";
    }
    if (value.trim().length < 2) {
      return "Name must be at least 2 characters.";
    }
    return "";
  },
  email: function (value) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value.trim().length === 0) {
      return "Please enter your email address.";
    }
    if (!pattern.test(value.trim())) {
      return "Please enter a valid email, like name@example.com.";
    }
    return "";
  },
  interest: function (value) {
    if (value === "") {
      return "Please select a class or event you're interested in.";
    }
    return "";
  }
};

function showFieldError(fieldId, message) {
  const errorEl = document.getElementById(fieldId + "-error");
  const fieldEl = document.getElementById(fieldId);
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.hidden = message === "";
  }
  if (fieldEl) {
    if (message) {
      fieldEl.setAttribute("aria-invalid", "true");
    } else {
      fieldEl.removeAttribute("aria-invalid");
    }
  }
}

function validateField(fieldId) {
  const fieldEl = document.getElementById(fieldId);
  const rule = validationRules[fieldId];
  if (!fieldEl || !rule) return true;

  const message = rule(fieldEl.value);
  showFieldError(fieldId, message);
  return message === "";
}

function validateForm() {
  let isValid = true;
  Object.keys(validationRules).forEach(function (fieldId) {
    const fieldIsValid = validateField(fieldId);
    if (!fieldIsValid) isValid = false;
  });
  return isValid;
}

function initFormValidation() {
  const form = document.getElementById("interest-form");
  if (!form) return; // not on events.html

  form.addEventListener("submit", function (event) {
    const isValid = validateForm();
    if (!isValid) {
      event.preventDefault();
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
    }
  });

  // Let visitors clear an error as soon as they correct a field,
  // rather than making them resubmit the whole form to see progress.
  Object.keys(validationRules).forEach(function (fieldId) {
    const fieldEl = document.getElementById(fieldId);
    if (!fieldEl) return;
    fieldEl.addEventListener("input", function () {
      validateField(fieldId);
    });
    fieldEl.addEventListener("change", function () {
      validateField(fieldId);
    });
  });
}

function initEventsPage() {
  prefillInterestField();
  initFormValidation();
}

/* -------------------- Startup -------------------- */

document.addEventListener("DOMContentLoaded", function () {
  initServicesPage();
  initEventsPage();
});
