// Multi-step booking form controller
class MultiStepBookingForm {
    constructor() {
        this.currentStep = 1
        this.totalSteps = 4
        this.formData = {}
        this.dailyPlans = {}
        this.container = document.querySelector("#container__customize .form-content")
        this.closeSidebar = document.querySelector(".close-sidebar")
        this.init()
    }

    init() {
        this.initStepNavigation()
        this.updateStepDisplay()
        this.closeSidebarHandler()
    }

    closeSidebarHandler() {
        if (this.closeSidebar) {
            this.closeSidebar.addEventListener("click", () => {
                this.tourInfoForm.sidebar.classList.remove("active")
            })
        }
    }

    initStepNavigation() {
        const prevBtn = document.getElementById("prevBtn")
        const nextBtn = document.getElementById("nextBtn")

        prevBtn.addEventListener("click", () => this.previousStep())
        nextBtn.addEventListener("click", () => this.nextStep())
    }

    nextStep() {
        if (this.validateCurrentStep()) {
            this.saveCurrentStepData()

            if (this.currentStep < this.totalSteps) {
                this.currentStep++
                this.updateStepDisplay()

                // Generate daily plans when moving to step 2
                if (this.currentStep === 2) {
                    this.dailyPlanForm.generateDailyPlans()
                    this.container.classList.add("step-2")
                }

                this.tourInfoForm.updateSidebar()
            }
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--
            this.updateStepDisplay()
        }
    }

    validateCurrentStep() {
        switch (this.currentStep) {
            case 1:
                return this.tourInfoForm.validateForm()
            case 2:
                return this.dailyPlanForm.validateForm()
            case 3:
                return this.validateContactInfo()
            case 4:
                return this.validatePayment()
            default:
                return true
        }
    }

    saveCurrentStepData() {
        switch (this.currentStep) {
            case 1:
                this.formData.tourInfo = this.tourInfoForm.getFormData()
                break
            case 2:
                this.formData.dailyPlan = this.dailyPlanForm.getFormData()
                break
            case 3:
                this.formData.contactInfo = this.getContactData()
                break
            case 4:
                this.formData.payment = this.getPaymentData()
                break
        }

        localStorage.setItem("multiStepBookingData", JSON.stringify(this.formData))
    }

    updateStepDisplay() {
        document.querySelectorAll(".step").forEach((step, index) => {
            const stepNumber = index + 1
            if (stepNumber === this.currentStep) {
                step.classList.add("active")
            } else if (stepNumber < this.currentStep) {
                step.classList.add("completed")
                step.classList.remove("active")
            } else {
                step.classList.remove("active", "completed")
            }
        })

        document.querySelectorAll(".step-content").forEach((content, index) => {
            const stepNumber = index + 1
            if (stepNumber === this.currentStep) {
                content.classList.add("active")
            } else {
                content.classList.remove("active")
            }
        })

        const prevBtn = document.getElementById("prevBtn")
        const nextBtn = document.getElementById("nextBtn")

        prevBtn.disabled = this.currentStep === 1

        if (this.currentStep === this.totalSteps) {
            nextBtn.classList.add("complete-btn")
        } else {
            nextBtn.classList.remove("complete-btn")
        }
    }

    validateContactInfo() {
        return true
    }

    validatePayment() {
        return true
    }

    getContactData() {
        return {}
    }

    getPaymentData() {
        return {}
    }
}

// Tour Information Form (Step 1)
class TourInformationForm {
    constructor(bookForm) {
        this.bookForm = bookForm
        this.isSidebarTrigger = false
        this.isTriggerGiftAndCoupon = false
        this.startDate = null
        this.endDate = null
        this.sidebar = document.querySelector("#container__customize .sidebar")
        this.sidebarTemplate = document.querySelector("#sidebar__template")?.content
        this.init()
    }

    init() {
        this.initDatePickers()
        this.initQuantityControls()
        this.updateTotalPax()
    }

    initDatePickers() {
        const startDateInput = document.getElementById("startDate")
        const endDateInput = document.getElementById("endDate")
        const flatpickr = window.flatpickr

        startDateInput.addEventListener("click", () => {
            this.startDatePicker.open()
        })

        endDateInput.addEventListener("click", () => {
            this.endDatePicker.open()
        })

        this.startDatePicker = flatpickr("#startDate", {
            dateFormat: "Y-m-d",
            minDate: "today",
            allowInput: false,
            clickOpens: true,
            disableMobile: true,
            onChange: (selectedDates, dateStr) => {
                this.startDate = selectedDates[0]
                this.updateEndDateMinDate?.()
                this.calculateDays?.()
                this.updateSidebar?.()
            },
            onOpen: () => {
                startDateInput.blur()
            },
        })

        this.endDatePicker = flatpickr("#endDate", {
            dateFormat: "Y-m-d",
            minDate: "today",
            allowInput: false,
            clickOpens: true,
            disableMobile: true,
            onChange: (selectedDates, dateStr) => {
                this.endDate = selectedDates[0]
                this.calculateDays?.()
                this.updateSidebar?.()
            },
            onOpen: () => {
                endDateInput.blur()
            },
        })
    }

    updateEndDateMinDate() {
        if (this.startDate) {
            const nextDay = new Date(this.startDate)
            nextDay.setDate(nextDay.getDate() + 1)
            this.endDatePicker.set("minDate", nextDay)
        }
    }

    calculateDays() {
        if (this.startDate && this.endDate) {
            const timeDiff = this.endDate.getTime() - this.startDate.getTime()
            const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))
            document.getElementById("tourDays").textContent = `${dayDiff} days`
            return dayDiff
        }
        document.getElementById("tourDays").textContent = "0 days"
        return 0
    }

    initQuantityControls() {
        const qtyButtons = document.querySelectorAll(".qty-btn")
        const qtyDisplay = document.querySelectorAll(".quantity-number")
        if (!qtyButtons || !qtyDisplay) return

        qtyButtons.forEach((button) => {
            button.addEventListener("click", (e) => {
                e.preventDefault()
                const target = button.dataset.target
                const input = document.getElementById(target)
                const isPlus = button.classList.contains("plus")
                const currentValue = Number.parseInt(input.value) || 0
                const currentQtyDisplay = Array.from(qtyDisplay).find((q) => q.dataset.target === target)

                if (isPlus) {
                    input.value = currentValue + 1
                    currentQtyDisplay.textContent = currentValue + 1
                } else if (currentValue > 0) {
                    input.value = currentValue - 1
                    currentQtyDisplay.textContent = currentValue - 1
                }

                this.updateTotalPax()
                this.updateSidebar()
            })
        })
    }

    updateTotalPax() {
        const total = this.getTotalPaxCount().totalPax
        document.getElementById("totalPax").textContent = `${total} pax`
        return total
    }

    getTotalPaxCount() {
        const adults = Number.parseInt(document.getElementById("adults").value) || 0
        const children1 = Number.parseInt(document.getElementById("children1").value) || 0
        const children2 = Number.parseInt(document.getElementById("children2").value) || 0
        const children3 = Number.parseInt(document.getElementById("children3").value) || 0

        const childrenTotal = children1 + children2 + children3
        const totalPax = adults + childrenTotal
        return {
            totalPax,
            adults,
            children: childrenTotal,
        }
    }

    updateSidebar(isCustomize = false) {
        const template = this.sidebarTemplate.cloneNode(true)
        const sidebarStartDate = template.getElementById("sidebarStartDate")
        const sidebarEndDate = template.getElementById("sidebarEndDate")
        const sidebarDays = template.getElementById("sidebarDays")
        const sidebarGift = template.querySelector(".gift-section")
        const giftContent = template.getElementById("sidebar-gift")
        const sidebarCoupon = template.querySelector(".coupon-section")
        const sidebarDayDetails = template.querySelector(".tour-summary")
        const sidebarTotalDay = template.querySelector(".summary-total .total-day")
        const sidebarTotalPrice = template.querySelector(".total-price")

        if (sidebarStartDate && this.startDate) {
            sidebarStartDate.textContent = this.formatDate(this.startDate)
        }

        if (sidebarEndDate && this.endDate) {
            sidebarEndDate.textContent = this.formatDate(this.endDate)
        }

        const days = this.calculateDays()
        if (days > 0 && sidebarDays) {
            sidebarDays.textContent = `${days} days`
        }

        if (sidebarDayDetails) {
            if (sidebarStartDate.textContent && sidebarEndDate.textContent) {
                sidebarDayDetails.innerHTML = ""
                !this.isSidebarTrigger ? sidebarDayDetails.classList.add("active") : sidebarDayDetails.classList.add("complete")
                this.isSidebarTrigger = true
                for (let i = 1; i <= days; i++) {
                    const dayDetail = document.createElement("div")
                    dayDetail.className = "tour-item"
                    dayDetail.innerHTML = this.repeaterDayDetails(
                        i,
                        this.getTotalPaxCount().children,
                        this.getTotalPaxCount().adults,
                    )
                    sidebarDayDetails.appendChild(dayDetail)
                }
            }
        }

        if (sidebarTotalDay) {
            sidebarTotalDay.textContent = `${days} days`
        }
        if (sidebarTotalPrice) {
            sidebarTotalPrice.textContent = "6.000.000 VND"
        }

        if (sidebarGift && giftContent && sidebarCoupon) {
            if (this.bookForm.currentStep >= 2) {
                if (!this.isTriggerGiftAndCoupon) {
                    sidebarGift.classList.add("active")
                    sidebarCoupon.classList.add("active")
                    this.isTriggerGiftAndCoupon = true
                    giftContent.textContent = "Default Gift"
                } else {
                    sidebarGift.classList.add("complete-trigger")
                    sidebarCoupon.classList.add("complete-trigger")
                }
            }
        }

        if (this.sidebar) {
            this.sidebar.innerHTML = ""
            this.sidebar.appendChild(template)
        }
    }

    repeaterDayDetails(index, childrenNumber = 0, adultsNumber = 4) {
        return `
              <div class="tour-item-title">
                  <p class="label">Day ${index}: --</p>
              </div>
              <div class="tour-members-day">
                  <p>Adults: <strong>X${adultsNumber}</strong></p>
                  <p>Children: <strong>X${childrenNumber}</strong></p>
              </div>
          `
    }

    formatDate(date) {
        return date.toLocaleDateString("en-CA")
    }

    validateForm() {
        let isValid = true
        const errors = []

        this.clearAllErrors()

        if (!document.getElementById("startDate").value) {
            this.showFieldError("startDate", "Start date is required")
            errors.push("Start date is required")
            isValid = false
        }

        if (!document.getElementById("endDate").value) {
            this.showFieldError("endDate", "End date is required")
            errors.push("End date is required")
            isValid = false
        }

        const totalPax = this.getTotalPaxCount().totalPax
        if (totalPax < 1) {
            this.showFieldError("totalPax", "At least 1 passenger is required")
            errors.push("At least 1 passenger is required")
            isValid = false
        }

        if (!isValid) {
            this.showFormErrors(errors)
        }

        return isValid
    }

    showFieldError(fieldName, message) {
        const errorElement = document.querySelector(`[data-field="${fieldName}"]`)
        if (errorElement) {
            errorElement.textContent = message
            errorElement.classList.add("show")
        }
    }

    clearAllErrors() {
        const errorElements = document.querySelectorAll(".error-message")
        errorElements.forEach((element) => {
            element.classList.remove("show")
        })
    }

    showFormErrors(errors) {
        const formErrors = document.getElementById("formErrors")
        formErrors.innerHTML = `
              <strong>Please fix the following errors:</strong><br>
              ${errors.map((error) => `• ${error}`).join("<br>")}
          `
        formErrors.classList.add("show")
    }

    getFormData() {
        return {
            startDate: document.getElementById("startDate").value,
            endDate: document.getElementById("endDate").value,
            days: this.calculateDays(),
            paxType: document.querySelector('input[name="paxType"]:checked')?.value,
            adults: Number.parseInt(document.getElementById("adults").value) || 0,
            children1: Number.parseInt(document.getElementById("children1").value) || 0,
            children2: Number.parseInt(document.getElementById("children2").value) || 0,
            children3: Number.parseInt(document.getElementById("children3").value) || 0,
            totalPax: this.getTotalPaxCount().totalPax,
        }
    }
}

// Daily Plan Form (Step 2)
class DailyPlanForm {
    constructor(bookingForm) {
        this.bookingForm = bookingForm
        this.dailyPlans = {}

        // Updated region mapping to match API slugs
        this.regions = [
            { value: "north", label: "Miền Bắc", slug: "north" },
            { value: "central-vietnam", label: "Miền Trung", slug: "central-vietnam" },
            { value: "south", label: "Miền Nam", slug: "south" },
            { value: "phu-quoc-island", label: "Phú Quốc", slug: "phu-quoc-island" }
        ]

        this.cities = [] // Will be loaded from API
        this.currentCities = {} // Cache cities by region

        this.tourTypes = [
            { value: "adventure-tour", label: "Adventure Tour" },
            { value: "mini-tour", label: "Mini Tour" },
            { value: "cultural-tour", label: "Cultural Tour" },
            { value: "beach-tour", label: "Beach Tour" },
            { value: "food-tour", label: "Food Tour" },
            { value: "nature-tour", label: "Nature Tour" },
            { value: "city-tour", label: "City Tour" },
            { value: "motorcycle-tour", label: "Motorcycle Tour" },
            { value: "cruise-tour", label: "Cruise Tour" },
            { value: "photography-tour", label: "Photography Tour" },
            { value: "wellness-tour", label: "Wellness Tour" },
            { value: "eco-tour", label: "Eco Tour" },
            { value: "luxury-tour", label: "Luxury Tour" }
        ]

        this.init()
    }

    init() {
        // Initialize will be called when step 2 is activated
    }

    // Fetch destination children from API
    async fetchDestinationChildren(slug) {
        try {
            const response = await fetch(`https://lotus.okhub-tech.com/wp-json/api/v1/destination-children?slug=${slug}`)
            const data = await response.json()
            return data.map(city => ({
                value: city.slug,
                label: city.name,
                region: slug
            }))
        } catch (error) {
            console.error('Error fetching destination children:', error)
            return []
        }
    }

    // Load cities for a specific region
    async loadCitiesForRegion(regionSlug, dayNumber) {
        if (this.currentCities[regionSlug]) {
            return this.currentCities[regionSlug]
        }

        try {
            const cities = await this.fetchDestinationChildren(regionSlug)
            this.currentCities[regionSlug] = cities
            return cities
        } catch (error) {
            console.error(`Error loading cities for region ${regionSlug}:`, error)
            return []
        }
    }

    generateDailyPlans() {
        const tourInfo = this.bookingForm.tourInfoForm.getFormData()
        const days = tourInfo.days
        const container = document.getElementById("dailyPlanContainer")

        container.innerHTML = ""

        for (let i = 1; i <= days; i++) {
            const dayElement = this.createDayElement(i, tourInfo.startDate)
            container.appendChild(dayElement)
        }
    }

    createDayElement(dayNumber, startDate) {
        // Calculate the date for this day
        const date = new Date(startDate)
        date.setDate(date.getDate() + (dayNumber - 1))
        const formattedDate = date.toISOString().split("T")[0]

        // Get template and clone it
        const template = document.getElementById("daily-plan-template")
        const dayElement = template.content.cloneNode(true)
        const dayDiv = dayElement.querySelector(".daily-plan-day")

        // Set the day container ID
        dayDiv.id = `day-${dayNumber}`

        // Update dynamic content using helper method
        this.updateTemplateContent(dayElement, dayNumber, formattedDate)
        this.setTemplateAttributes(dayElement, dayNumber)

        // Initialize events and return the container div
        this.initDayEvents(dayNumber, dayDiv)
        return dayDiv
    }

    // Helper method to update dynamic content in template
    updateTemplateContent(dayElement, dayNumber, formattedDate) {
        // Update all text content that needs day number or date
        const updates = [
            { selector: ".day-number", content: dayNumber },
            { selector: ".day-date", content: formattedDate },
            { selector: ".day-number-text", content: dayNumber },
            { selector: ".section-date-text", content: formattedDate },
            { selector: ".collapsed-day-number", content: dayNumber },
            { selector: ".collapsed-date", content: formattedDate }
        ]

        updates.forEach(({ selector, content }) => {
            dayElement.querySelectorAll(selector).forEach(el => el.textContent = content)
        })
    }

    // Helper method to set all unique attributes for form elements
    setTemplateAttributes(dayElement, dayNumber) {
        // Configure form elements with unique IDs and names
        const elements = [
            { selector: ".no-service-checkbox", id: `noService-${dayNumber}`, attrs: { "data-day": dayNumber } },
            { selector: ".city-search", id: `city-${dayNumber}`, name: `city-${dayNumber}` },
            { selector: ".city-dropdown", id: `cityDropdown-${dayNumber}` },
            { selector: ".city-label", attrs: { "for": `city-${dayNumber}` } },
            { selector: ".tour-type-search", id: `tourType-${dayNumber}`, name: `tourType-${dayNumber}` },
            { selector: ".tour-type-dropdown", id: `tourTypeDropdown-${dayNumber}` },
            { selector: ".tour-type-label", attrs: { "for": `tourType-${dayNumber}` } },
            { selector: ".tour-cards", id: `tourCards-${dayNumber}` },
            { selector: ".room-count", id: `roomCount-${dayNumber}` },
            { selector: ".hotel-options", id: `hotelOptions-${dayNumber}` },
            { selector: ".hotel-gallery", id: `hotelGallery-${dayNumber}` },
            { selector: ".day-content", id: `dayContent-${dayNumber}` },
            { selector: ".day-collapsed", id: `dayCollapsed-${dayNumber}` },
            { selector: ".collapsed-location", id: `collapsedLocation-${dayNumber}` },
            { selector: ".collapsed-city", id: `collapsedCity-${dayNumber}` },
            { selector: ".collapsed-tour-type", id: `collapsedTourType-${dayNumber}` },
            { selector: ".city-section", id: `citySection-${dayNumber}` }
        ]

        // Set IDs and basic attributes
        elements.forEach(({ selector, id, name, attrs }) => {
            const element = dayElement.querySelector(selector)
            if (element) {
                if (id) element.id = id
                if (name) element.name = name
                if (attrs) {
                    Object.entries(attrs).forEach(([attr, value]) => {
                        element.setAttribute(attr, value)
                    })
                }
            }
        })

        // Set radio button names (multiple elements)
        dayElement.querySelectorAll(".location-radio").forEach(radio => {
            radio.name = `location-${dayNumber}`
        })

        // Set room control data-day attributes
        dayElement.querySelectorAll(".room-btn").forEach(btn => {
            btn.setAttribute("data-day", dayNumber)
        })

        // Set action button data-day attributes
        dayElement.querySelectorAll(".confirm-day-btn, .see-detail-btn").forEach(btn => {
            btn.setAttribute("data-day", dayNumber)
        })

        // Set service checkbox names
        const serviceCheckboxes = [
            { class: ".extra-bed-checkbox", name: `extraBed-${dayNumber}` },
            { class: ".add-bed-checkbox", name: `addBed-${dayNumber}` },
            { class: ".no-need-checkbox", name: `noNeed-${dayNumber}` },
            { class: ".visa-checkbox", name: `visa-${dayNumber}` },
            { class: ".massage-checkbox", name: `massage-${dayNumber}` },
            { class: ".romantic-checkbox", name: `romantic-${dayNumber}` },
            { class: ".arrival-checkbox", name: `arrival-${dayNumber}` },
            { class: ".vietnamese-checkbox", name: `vietnamese-${dayNumber}` },
            { class: ".party-checkbox", name: `party-${dayNumber}` },
            { class: ".departure-checkbox", name: `departure-${dayNumber}` },
            { class: ".photography-checkbox", name: `photography-${dayNumber}` }
        ]

        serviceCheckboxes.forEach(({ class: className, name }) => {
            const element = dayElement.querySelector(className)
            if (element) element.name = name
        })
    }

    initDayEvents(dayNumber, dayElement = null) {
        // No service checkbox - use dayElement if provided, otherwise fallback to document
        const noServiceCheckbox = dayElement
            ? dayElement.querySelector(`#noService-${dayNumber}`)
            : document.getElementById(`noService-${dayNumber}`)

        if (noServiceCheckbox) {
            noServiceCheckbox.addEventListener("change", (e) => {
                this.toggleNoService(dayNumber, e.target.checked)
            })
        }

        // Location selection
        const locationRadios = dayElement
            ? dayElement.querySelectorAll(`input[name="location-${dayNumber}"]`)
            : document.querySelectorAll(`input[name="location-${dayNumber}"]`)
        locationRadios.forEach((radio) => {
            radio.addEventListener("change", () => {
                this.updateCityOptions(dayNumber, radio.value)
            })
        })

        // City search - Updated to show all on focus and search on input
        const citySearch = dayElement
            ? dayElement.querySelector(`#city-${dayNumber}`)
            : document.getElementById(`city-${dayNumber}`)

        if (citySearch) {
            citySearch.addEventListener("focus", (e) => {
                this.showAllCities(dayNumber)
            })
            citySearch.addEventListener("input", (e) => {
                this.searchCities(dayNumber, e.target.value)
            })
            citySearch.addEventListener("blur", (e) => {
                // Delay hiding to allow clicking on dropdown options
                setTimeout(() => {
                    const dropdown = document.getElementById(`cityDropdown-${dayNumber}`)
                    if (dropdown) dropdown.style.display = "none"
                }, 200)
            })
        }

        // Tour type search - Updated to show all on focus and search on input
        const tourTypeSearch = dayElement
            ? dayElement.querySelector(`#tourType-${dayNumber}`)
            : document.getElementById(`tourType-${dayNumber}`)

        if (tourTypeSearch) {
            tourTypeSearch.addEventListener("focus", (e) => {
                this.showAllTourTypes(dayNumber)
            })
            tourTypeSearch.addEventListener("input", (e) => {
                this.searchTourTypes(dayNumber, e.target.value)
            })
            tourTypeSearch.addEventListener("blur", (e) => {
                // Delay hiding to allow clicking on dropdown options
                setTimeout(() => {
                    const dropdown = document.getElementById(`tourTypeDropdown-${dayNumber}`)
                    if (dropdown) dropdown.style.display = "none"
                }, 200)
            })
        }

        // Room controls
        const roomMinusBtn = dayElement
            ? dayElement.querySelector(`.room-btn.minus[data-day="${dayNumber}"]`)
            : document.querySelector(`.room-btn.minus[data-day="${dayNumber}"]`)
        const roomPlusBtn = dayElement
            ? dayElement.querySelector(`.room-btn.plus[data-day="${dayNumber}"]`)
            : document.querySelector(`.room-btn.plus[data-day="${dayNumber}"]`)

        if (roomMinusBtn) roomMinusBtn.addEventListener("click", () => this.updateRoomCount(dayNumber, -1))
        if (roomPlusBtn) roomPlusBtn.addEventListener("click", () => this.updateRoomCount(dayNumber, 1))

        // Confirm day button
        const confirmBtn = dayElement
            ? dayElement.querySelector(`.confirm-day-btn[data-day="${dayNumber}"]`)
            : document.querySelector(`.confirm-day-btn[data-day="${dayNumber}"]`)

        if (confirmBtn) {
            confirmBtn.addEventListener("click", () => {
                this.confirmDay(dayNumber)
            })
        }

        // See detail button (will be added after collapse)
        setTimeout(() => {
            const seeDetailBtn = document.querySelector(`.see-detail-btn[data-day="${dayNumber}"]`)
            if (seeDetailBtn) {
                seeDetailBtn.addEventListener("click", () => {
                    this.expandDay(dayNumber)
                })
            }
        }, 100)

        // Initialize dropdowns after element is appended to DOM
        setTimeout(() => {
            // Set default region to north
            const firstRadio = document.querySelector(`input[name="location-${dayNumber}"]`)
            if (firstRadio) {
                firstRadio.checked = true
                this.updateCityOptions(dayNumber, firstRadio.value)
            }
            this.initTourTypeSearch(dayNumber)
        }, 50)
    }

    toggleNoService(dayNumber, isNoService) {
        const dayContent = document.getElementById(`dayContent-${dayNumber}`)
        const dayCollapsed = document.getElementById(`dayCollapsed-${dayNumber}`)

        if (isNoService) {
            dayContent.style.display = "none"
            // dayCollapsed.style.display = "block"

            // Update collapsed content for no service
            // const collapsedContent = dayCollapsed.querySelector(".collapsed-content")
            // collapsedContent.innerHTML = `
            //     <h4>Day ${dayNumber}: No use service for this day</h4>
            //     <div class="no-service-indicator">
            //         <span class="free-day-badge">Free Day</span>
            //     </div>
            // `

            // Store no service data
            this.dailyPlans[dayNumber] = {
                noService: true,
                confirmed: true
            }

            // Update sidebar to show free day
            this.updateSidebarForFreeDay(dayNumber)
        } else {
            dayContent.style.display = "block"
            // dayCollapsed.style.display = "none"

            // Clear no service data
            if (this.dailyPlans[dayNumber]) {
                delete this.dailyPlans[dayNumber].noService
                delete this.dailyPlans[dayNumber].confirmed
            }
        }
    }

    async updateCityOptions(dayNumber, region) {
        const citySection = document.getElementById(`citySection-${dayNumber}`)
        const citySearch = document.getElementById(`city-${dayNumber}`)
        const dropdown = document.getElementById(`cityDropdown-${dayNumber}`)

        // Handle Phu Quoc special case - hide city selection
        if (region === 'phu-quoc-island') {
            if (citySection) citySection.style.display = 'none'
            if (citySearch) {
                citySearch.value = 'Phu Quoc Island'
                citySearch.dataset.value = 'phu-quoc-island'
            }
            return
        } else {
            if (citySection) citySection.style.display = 'flex'
        }

        // Load cities from API for the selected region
        const cities = await this.loadCitiesForRegion(region, dayNumber)

        if (!citySearch || !dropdown) {
            console.warn(`Elements not found for day ${dayNumber}`)
            return
        }

        // Clear previous selections
        citySearch.value = ''
        citySearch.dataset.value = ''
        dropdown.innerHTML = ""

        // Add cities to dropdown
        cities.forEach((city) => {
            const option = document.createElement("div")
            option.className = "dropdown-option"
            option.textContent = city.label
            option.addEventListener("click", () => {
                citySearch.value = city.label
                citySearch.dataset.value = city.value
                dropdown.style.display = "none"

                const tourTypeSearch = document.getElementById(`tourType-${dayNumber}`)
                if (tourTypeSearch && tourTypeSearch.dataset.value) {
                    this.loadTours(dayNumber, city.value, tourTypeSearch.dataset.value)
                }
            })
            dropdown.appendChild(option)
        })
    }

    // Show all cities when focusing on city search
    showAllCities(dayNumber) {
        const selectedRegion = document.querySelector(`input[name="location-${dayNumber}"]:checked`)?.value
        if (!selectedRegion || selectedRegion === 'phu-quoc-island') return

        const dropdown = document.getElementById(`cityDropdown-${dayNumber}`)
        if (!dropdown) return

        if (this.currentCities[selectedRegion] && this.currentCities[selectedRegion].length > 0) {
            dropdown.style.display = "block"
        }
    }

    searchCities(dayNumber, query) {
        const selectedRegion = document.querySelector(`input[name="location-${dayNumber}"]:checked`)?.value
        if (!selectedRegion || selectedRegion === 'phu-quoc-island') return

        const cities = this.currentCities[selectedRegion] || []
        const filteredCities = cities.filter(
            (city) => city.label.toLowerCase().includes(query.toLowerCase())
        )

        const dropdown = document.getElementById(`cityDropdown-${dayNumber}`)
        if (!dropdown) return

        dropdown.innerHTML = ""
        dropdown.style.display = filteredCities.length > 0 ? "block" : "none"

        filteredCities.forEach((city) => {
            const option = document.createElement("div")
            option.className = "dropdown-option"
            option.textContent = city.label
            option.addEventListener("click", () => {
                const citySearch = document.getElementById(`city-${dayNumber}`)
                citySearch.value = city.label
                citySearch.dataset.value = city.value
                dropdown.style.display = "none"

                const tourTypeSearch = document.getElementById(`tourType-${dayNumber}`)
                if (tourTypeSearch && tourTypeSearch.dataset.value) {
                    this.loadTours(dayNumber, city.value, tourTypeSearch.dataset.value)
                }
            })
            dropdown.appendChild(option)
        })
    }

    // Show all tour types when focusing on tour type search
    showAllTourTypes(dayNumber) {
        const dropdown = document.getElementById(`tourTypeDropdown-${dayNumber}`)
        if (!dropdown) return

        dropdown.innerHTML = ""
        dropdown.style.display = "block"

        this.tourTypes.forEach((type) => {
            const option = document.createElement("div")
            option.className = "dropdown-option"
            option.textContent = type.label
            option.addEventListener("click", () => {
                const tourTypeSearch = document.getElementById(`tourType-${dayNumber}`)
                tourTypeSearch.value = type.label
                tourTypeSearch.dataset.value = type.value
                dropdown.style.display = "none"

                const citySearch = document.getElementById(`city-${dayNumber}`)
                if (citySearch && citySearch.dataset.value) {
                    this.loadTours(dayNumber, citySearch.dataset.value, type.value)
                }
            })
            dropdown.appendChild(option)
        })
    }

    initTourTypeSearch(dayNumber) {
        const tourTypeSearch = document.getElementById(`tourType-${dayNumber}`)
        const dropdown = document.getElementById(`tourTypeDropdown-${dayNumber}`)

        // Add null check to prevent errors
        if (!tourTypeSearch || !dropdown) {
            console.warn(`Tour type elements not found for day ${dayNumber}`)
            return
        }

        // Initial setup will be handled by showAllTourTypes when focused
    }

    searchTourTypes(dayNumber, query) {
        const filteredTypes = this.tourTypes.filter((type) => type.label.toLowerCase().includes(query.toLowerCase()))

        const dropdown = document.getElementById(`tourTypeDropdown-${dayNumber}`)
        if (!dropdown) return

        dropdown.innerHTML = ""
        dropdown.style.display = filteredTypes.length > 0 ? "block" : "none"

        filteredTypes.forEach((type) => {
            const option = document.createElement("div")
            option.className = "dropdown-option"
            option.textContent = type.label
            option.addEventListener("click", () => {
                const tourTypeSearch = document.getElementById(`tourType-${dayNumber}`)
                tourTypeSearch.value = type.label
                tourTypeSearch.dataset.value = type.value
                dropdown.style.display = "none"

                const citySearch = document.getElementById(`city-${dayNumber}`)
                if (citySearch && citySearch.dataset.value) {
                    this.loadTours(dayNumber, citySearch.dataset.value, type.value)
                }
            })
            dropdown.appendChild(option)
        })
    }

    async loadTours(dayNumber, destination, tourType) {
        if (!destination || !tourType) return

        const tourCards = document.getElementById(`tourCards-${dayNumber}`)
        tourCards.innerHTML = '<div class="loading">Loading tours...</div>'

        try {
            // Use the actual API to fetch tours
            const tours = await this.fetchToursFromAPI(destination, tourType)
            this.renderTours(dayNumber, tours)
        } catch (error) {
            console.error("Error loading tours:", error)
            tourCards.innerHTML = '<div class="error">Error loading tours. Please try again.</div>'
        }
    }

    async fetchToursFromAPI(destination, tourType) {
        try {
            const response = await fetch(`https://lotus.okhub-tech.com/wp-json/api/v1/tours-by-tax?destination=${destination}&tour_type=${tourType}`)
            const data = await response.json()

            // Transform API data to expected format
            return data.map(tour => ({
                id: tour.id,
                name: tour.title,
                description: `Explore ${tour.title} with professional guidance`,
                image: "/placeholder.svg?height=150&width=200",
                type: "Guided Tour",
                services: ["Professional guide", "Transportation", "Entrance fees"],
                price: Math.floor(Math.random() * 400) + 200,
                duration: "Full day",
                rating: 4.5,
                link: tour.link
            }))
        } catch (error) {
            console.error('Error fetching tours from API:', error)
            // Fallback to mock data if API fails
            return this.fetchTours(destination, tourType)
        }
    }

    async fetchTours(destination, tourType) {
        // Fallback mock data generator
        return new Promise((resolve) => {
            setTimeout(() => {
                const destinationLabels = this.currentCities[destination] ?
                    this.currentCities[destination].find(c => c.value === destination)?.label || destination : destination
                const tourTypeLabels = this.tourTypes.find(t => t.value === tourType)?.label || tourType

                const mockTours = [
                    {
                        id: `${destination}-${tourType}-1`,
                        name: `${destinationLabels} ${tourTypeLabels} - Half Day`,
                        description: `Discover the highlights of ${destinationLabels} with our expertly guided ${tourTypeLabels.toLowerCase()}`,
                        image: "/placeholder.svg?height=150&width=200",
                        type: "Group Tour",
                        services: ["Professional guide", "Transportation", "Entrance fees"],
                        price: Math.floor(Math.random() * 200) + 150,
                        duration: "4-5 hours",
                        rating: 4.5
                    },
                    {
                        id: `${destination}-${tourType}-2`,
                        name: `${destinationLabels} ${tourTypeLabels} - Full Day`,
                        description: `Complete ${tourTypeLabels.toLowerCase()} experience in ${destinationLabels} with lunch included`,
                        image: "/placeholder.svg?height=150&width=200",
                        type: "Private Tour",
                        services: ["Private guide", "Luxury transport", "Lunch", "Hotel pickup"],
                        price: Math.floor(Math.random() * 400) + 300,
                        duration: "8-9 hours",
                        rating: 4.8
                    },
                    {
                        id: `${destination}-${tourType}-3`,
                        name: `Premium ${destinationLabels} ${tourTypeLabels}`,
                        description: `Luxury ${tourTypeLabels.toLowerCase()} with exclusive access and premium services`,
                        image: "/placeholder.svg?height=150&width=200",
                        type: "Premium Experience",
                        services: ["Expert guide", "Premium transport", "VIP access", "Refreshments"],
                        price: Math.floor(Math.random() * 600) + 500,
                        duration: "6-7 hours",
                        rating: 4.9
                    }
                ]
                resolve(mockTours)
            }, 800)
        })
    }

    renderTours(dayNumber, tours) {
        const tourCards = document.getElementById(`tourCards-${dayNumber}`)

        if (tours.length === 0) {
            tourCards.innerHTML = '<div class="error">No tours found for selected criteria.</div>'
            return
        }

        tourCards.innerHTML = tours
            .map(
                (tour) => `
              <div class="tour-card" data-tour-id="${tour.id}" data-day="${dayNumber}">
                  <div class="tour-image">
                      <img src="${tour.image}" alt="${tour.name}">
                  </div>
                  <div class="tour-info">
                      <h4 class="tour-title">${tour.name}</h4>
                      <div class="tour-meta">
                          <p class="tour-departure">Departure: <span>Hanoi</span></p>
                          <p class="tour-type">Type: <span>Private Tour</span></p>
                      </div>
                  </div>
                  <div class="tour-taxonomy">
                        ${tour.services.map((service) => `<p class="service-taxonomy">${service}</p>`).join("")}
                    </div>
              </div>
          `,
            )
            .join("")

        // Add click events to tour cards
        tourCards.querySelectorAll(".tour-card").forEach((card) => {
            card.addEventListener("click", () => {
                this.selectTour(dayNumber, card, tours.find(t => t.id === card.dataset.tourId))
            })
        })
    }

    selectTour(dayNumber, selectedCard, tourData) {
        const tourCards = document.getElementById(`tourCards-${dayNumber}`)
        tourCards.querySelectorAll(".tour-card").forEach((card) => {
            card.classList.remove("selected")
        })
        selectedCard.classList.add("selected")

        // Store selected tour data with more details
        this.dailyPlans[dayNumber] = {
            ...this.dailyPlans[dayNumber],
            selectedTour: selectedCard.dataset.tourId,
            selectedTourData: tourData
        }
    }

    updateRoomCount(dayNumber, change) {
        const roomCountElement = document.getElementById(`roomCount-${dayNumber}`)
        let currentCount = Number.parseInt(roomCountElement.textContent) || 0

        currentCount = Math.max(0, currentCount + change)
        roomCountElement.textContent = currentCount.toString().padStart(2, "0")

        // Store room count
        this.dailyPlans[dayNumber] = {
            ...this.dailyPlans[dayNumber],
            roomCount: currentCount,
        }
    }

    confirmDay(dayNumber) {
        // Check if it's a no service day
        const noServiceCheckbox = document.getElementById(`noService-${dayNumber}`)
        if (noServiceCheckbox && noServiceCheckbox.checked) {
            // Already handled in toggleNoService
            return
        }

        // Validate day data
        if (!this.validateDay(dayNumber)) {
            return
        }

        // Collect day data
        const dayData = this.collectDayData(dayNumber)
        this.dailyPlans[dayNumber] = dayData

        // Collapse the day
        this.collapseDay(dayNumber, dayData)

        // Update sidebar with detailed information
        this.updateSidebarForDay(dayNumber, dayData)
    }

    validateDay(dayNumber) {
        const selectedRegion = document.querySelector(`input[name="location-${dayNumber}"]:checked`)?.value
        const citySearch = document.getElementById(`city-${dayNumber}`)
        const tourTypeSearch = document.getElementById(`tourType-${dayNumber}`)
        const selectedTour = document.querySelector(`#tourCards-${dayNumber} .tour-card.selected`)

        if (!selectedRegion) {
            alert("Please select a region")
            return false
        }

        // Skip city validation for Phu Quoc
        if (selectedRegion !== 'phu-quoc-island') {
            if (!citySearch.value) {
                alert("Please select a city")
                return false
            }
        }

        if (!tourTypeSearch.value) {
            alert("Please select a tour type")
            return false
        }

        if (!selectedTour) {
            alert("Please select a tour")
            return false
        }

        return true
    }

    collectDayData(dayNumber) {
        const location = document.querySelector(`input[name="location-${dayNumber}"]:checked`).value
        const citySearch = document.getElementById(`city-${dayNumber}`)
        const city = citySearch.value
        const cityValue = citySearch.dataset.value
        const tourTypeSearch = document.getElementById(`tourType-${dayNumber}`)
        const tourType = tourTypeSearch.value
        const tourTypeValue = tourTypeSearch.dataset.value
        const selectedTour = document.querySelector(`#tourCards-${dayNumber} .tour-card.selected`)
        const roomCount = Number.parseInt(document.getElementById(`roomCount-${dayNumber}`).textContent) || 0

        // Get tour info from dailyPlans
        const tourData = this.dailyPlans[dayNumber]?.selectedTourData || {}

        // Collect selected services
        const services = []
        document.querySelectorAll(`input[type="checkbox"][name*="-${dayNumber}"]:checked`).forEach((checkbox) => {
            const serviceName = checkbox.name.replace(`-${dayNumber}`, "")
            services.push(serviceName)
        })

        return {
            location,
            city,
            cityValue,
            tourType,
            tourTypeValue,
            selectedTour: selectedTour ? selectedTour.dataset.tourId : null,
            selectedTourData: tourData,
            roomCount,
            services,
            confirmed: true,
        }
    }

    collapseDay(dayNumber, dayData) {
        const dayContent = document.getElementById(`dayContent-${dayNumber}`)
        const dayCollapsed = document.getElementById(`dayCollapsed-${dayNumber}`)

        dayContent.style.display = "none"
        dayCollapsed.style.display = "block"

        // Update collapsed content with more details
        const collapsedContent = dayCollapsed.querySelector(".collapsed-content")
        collapsedContent.innerHTML = `
            <h4>Day ${dayNumber}: ${dayData.selectedTourData.name || 'Tour Selected'}</h4>
            <div class="collapsed-status">✓ Confirmed</div>
            <div class="collapsed-details">
                <p><strong>Region:</strong> ${this.regions.find(r => r.value === dayData.location)?.label || dayData.location}</p>
                ${dayData.location !== 'phu-quoc-island' ? `<p><strong>City:</strong> ${dayData.city}</p>` : ''}
                <p><strong>Tour Type:</strong> ${dayData.tourType}</p>
                <p><strong>Rooms:</strong> ${dayData.roomCount}</p>
                ${dayData.selectedTourData.price ? `<p><strong>Price:</strong> $${dayData.selectedTourData.price}</p>` : ''}
            </div>
            <button class="see-detail-btn" data-day="${dayNumber}">See Details</button>
        `
    }

    expandDay(dayNumber) {
        const dayContent = document.getElementById(`dayContent-${dayNumber}`)
        const dayCollapsed = document.getElementById(`dayCollapsed-${dayNumber}`)

        dayContent.style.display = "block"
        dayCollapsed.style.display = "none"

        // Re-initialize events for the expanded day
        this.initDayEvents(dayNumber)
    }

    updateSidebarForDay(dayNumber, dayData) {
        // Get passenger info from step 1
        const tourInfo = this.bookingForm.tourInfoForm.getFormData()

        // Update the tour summary in sidebar
        const tourSummary = document.querySelector(".tour-summary")
        if (tourSummary) {
            // Find the day item and update it
            const dayItems = tourSummary.querySelectorAll(".tour-item")
            if (dayItems[dayNumber - 1]) {
                const dayItem = dayItems[dayNumber - 1]
                dayItem.innerHTML = `
                    <div class="tour-item-title">
                        <p class="label">Day ${dayNumber}: <strong>${dayData.selectedTourData.name || 'Selected Tour'}</strong></p>
                        <p class="detail">Detail</p>
                    </div>
                    <div class="tour-members-day">
                        <p>Adults: <strong>X${tourInfo.adults}</strong></p>
                        <p>Children: <strong>X${tourInfo.children1 + tourInfo.children2 + tourInfo.children3}</strong></p>
                    </div>
                `
            }
        }

        console.log(`Day ${dayNumber} confirmed and sidebar updated:`, dayData)
    }

    updateSidebarForFreeDay(dayNumber) {
        // Get passenger info from step 1
        const tourInfo = this.bookingForm.tourInfoForm.getFormData()

        // Update the tour summary in sidebar
        const tourSummary = document.querySelector(".tour-summary")
        if (tourSummary) {
            // Find the day item and update it
            const dayItems = tourSummary.querySelectorAll(".tour-item")
            if (dayItems[dayNumber - 1]) {
                const dayItem = dayItems[dayNumber - 1]
                dayItem.innerHTML = `
                    <div class="tour-item-title">
                        <p class="label">Day ${dayNumber}: <strong>Free Day</strong></p>
                    </div>
                    <div class="tour-members-day">
                        <p>Adults: <strong>X${tourInfo.adults}</strong></p>
                        <p>Children: <strong>X${tourInfo.children1 + tourInfo.children2 + tourInfo.children3}</strong></p>
                    </div>
                `
            }
        }

        console.log(`Day ${dayNumber} set as free day and sidebar updated`)
    }

    validateForm() {
        // Check if all days are either confirmed or set as no service
        const totalDays = this.bookingForm.tourInfoForm.calculateDays()

        for (let i = 1; i <= totalDays; i++) {
            const noService = document.getElementById(`noService-${i}`).checked
            const isConfirmed = this.dailyPlans[i]?.confirmed

            if (!noService && !isConfirmed) {
                alert(`Please complete Day ${i} configuration`)
                return false
            }
        }

        return true
    }

    getFormData() {
        // Return comprehensive data including all day information
        return {
            dailyPlans: this.dailyPlans,
            totalDays: Object.keys(this.dailyPlans).length,
            confirmedDays: Object.values(this.dailyPlans).filter(day => day.confirmed).length,
            freeDays: Object.values(this.dailyPlans).filter(day => day.noService).length
        }
    }
}

// Initialize the multi-step form when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    const bookingForm = new MultiStepBookingForm()
    const tourInfoForm = new TourInformationForm(bookingForm)
    const dailyPlanForm = new DailyPlanForm(bookingForm)

    bookingForm.tourInfoForm = tourInfoForm
    bookingForm.dailyPlanForm = dailyPlanForm

    // Handle Open Video Tutorial
    const videoTutorialBtn = document.querySelector(".tutorial-btn")
    const closeTutorialBtn = document.querySelector(".tutorial__customize .close__tutorial")
    const videoModal = document.querySelector(".tutorial__customize")

    if (videoTutorialBtn && videoModal && closeTutorialBtn) {
        videoTutorialBtn.addEventListener("click", () => {
            videoModal.classList.add("active")
        })
        closeTutorialBtn.addEventListener("click", () => {
            videoModal.classList.remove("active")
        })
    }
})
