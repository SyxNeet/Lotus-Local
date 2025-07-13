// ===== DAILY PLAN FORM (STEP 2) =====
class DailyPlanForm {
    constructor(bookingForm) {
        this.bookingForm = bookingForm;
        this.dailyPlans = {};
        this.currentDay = 1;
        this.selectedCoupon = null; // ✅ ADDED: Keep selected coupon when switching steps
        this.isViewingDetailDay = false; // ✅ ADDED: Track if viewing day detail
        this.grandTotal = 0;
        this.currentPaxMode = "default";
        this.lastGeneratedMode = null;

        // Initialize managers
        this.regionCityManager = new RegionCityManager();
        this.tourManager = new TourManager();
        this.vehicleManager = new VehicleManager();
        this.guideManager = new GuideManager();
        this.hotelManager = new HotelManager();
        this.foodManager = new FoodManager(); // ✅ ADDED: Food manager

        // ✅ ADDED: Initialize coupon variables
        this.indexDiscout = null;
        this.indexDiscoutMemo = null;
        this.discoutValue = null;
        this.couponCode = null;
        this.isLoadingCoupons = false; // ✅ ADDED: Prevent duplicate API calls

        this.init();
        // ✅ ADD: Event delegation for coupon popup
        this.setupCouponPopupDelegation();
    }

    init() {
        // Managers are initialized in constructor
        this.initSearchCode();
        this.initDiscount();

        // ✅ ADDED: Initialize coupon and gift visibility
        this.updateCouponAndGiftVisibility();
    }

    generateDailyPlans() {
        const tourInfo = this.bookingForm.tourInfoForm.getFormData();
        const days = tourInfo.days;
        const container = document.getElementById("dailyPlanContainer");

        const currentMode = this.bookingForm.tourInfoForm.isCustomizeMode()
            ? "customize"
            : "default";
        const modeChanged =
            this.lastGeneratedMode && this.lastGeneratedMode !== currentMode;

        if (modeChanged) {
            this.clearAllDailyPlansData();
        }

        this.lastGeneratedMode = currentMode;

        container.innerHTML = "";

        for (let i = 1; i <= days; i++) {
            const dayElement = this.createDayElement(i, tourInfo.startDate);
            container.appendChild(dayElement);
        }

        if (!modeChanged) {
            this.restoreFormState();
        }

        // Load cities for checked regions (skip Phu Quoc)
        for (let i = 1; i <= days; i++) {
            const checkedRegion = document.querySelector(
                `input[name="location-${i}"]:checked`
            );
            if (checkedRegion && checkedRegion.value !== 'phu-quoc') {
                this.updateCityOptions(i, checkedRegion.value);
            }
        }
    }

    restoreFormState() {
        try {
            const savedData = localStorage.getItem("multiStepBookingData");
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                if (parsedData.dailyPlan && parsedData.dailyPlan.dailyPlans) {
                    this.dailyPlans = parsedData.dailyPlan.dailyPlans;
                    // Restore UI state for each day
                    Object.keys(this.dailyPlans).forEach((dayNumber) => {
                        this.restoreDayUI(parseInt(dayNumber));
                    });

                    // ✅ ADDED: Ensure sidebar is updated after restoring all days
                    setTimeout(() => {
                        if (this.bookingForm && this.bookingForm.tourInfoForm) {
                            this.bookingForm.tourInfoForm.restoreTourNamesInSidebar();
                        }
                    }, 1000);
                }
            }
        } catch (error) {
            console.error("Error restoring form state:", error);
        }
    }

    clearAllDailyPlansData() {
        this.dailyPlans = {};
        this.grandTotal = 0;

        const container = document.getElementById("dailyPlanContainer");
        if (container) {
            container
                .querySelectorAll('input[type="radio"]:checked')
                .forEach((radio) => {
                    radio.checked = false;
                });

            container.querySelectorAll('input[type="text"]').forEach((input) => {
                input.value = "";
                input.removeAttribute("data-value");
            });

            container
                .querySelectorAll('input[type="checkbox"]:checked')
                .forEach((checkbox) => {
                    checkbox.checked = false;
                });

            container
                .querySelectorAll(".room-count, .extra-bed-count")
                .forEach((counter) => {
                    counter.textContent = "01";
                });

            container.querySelectorAll(".tour-card.selected").forEach((card) => {
                card.classList.remove("selected");
            });

            container
                .querySelectorAll('[id^="tourCards-"]')
                .forEach((tourContainer) => {
                    tourContainer.innerHTML = "";
                });

            container.querySelectorAll(".total-price-day").forEach((priceDisplay) => {
                priceDisplay.innerHTML = "";
            });

            container.querySelectorAll(".progressive-section").forEach((section) => {
                section.style.display = "none";
                section.classList.remove("section-visible");
            });
        }

        this.resetSidebarToInitialState();
    }

    resetSidebarToInitialState() {
        if (this.bookingForm.tourInfoForm) {
            this.bookingForm.tourInfoForm.updateSidebar();
        }
    }

    notifyPaxModeChange(newPaxType) {
        const newMode = newPaxType === "customize" ? "customize" : "default";
        this.currentPaxMode = newMode;
    }

    createDayElement(dayNumber, startDate) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + (dayNumber - 1));
        const formattedDate = date.toISOString().split("T")[0];

        const template = document.getElementById("daily-plan-template");
        const dayElement = template.content.cloneNode(true);
        const dayDiv = dayElement.querySelector(".daily-plan-day");

        dayDiv.id = `day-${dayNumber}`;

        this.updateTemplateContent(dayElement, dayNumber, formattedDate);
        this.setTemplateAttributes(dayElement, dayNumber);
        this.initDayEvents(dayNumber, dayDiv);

        return dayDiv;
    }

    updateTemplateContent(dayElement, dayNumber, formattedDate) {
        const updates = [
            { selector: ".day-number", content: dayNumber },
            { selector: ".day-date", content: formattedDate },
            { selector: ".day-number-text", content: dayNumber },
            { selector: ".section-date-text", content: formattedDate },
            { selector: ".collapsed-day-number", content: dayNumber },
            { selector: ".collapsed-date", content: formattedDate },
        ];

        updates.forEach(({ selector, content }) => {
            dayElement
                .querySelectorAll(selector)
                .forEach((el) => (el.textContent = content));
        });

        this.handlePaxSectionForDay(dayElement, dayNumber);
        this.hideProgressiveSections(dayElement);
    }

    handlePaxSectionForDay(dayElement, dayNumber) {
        const isCustomizeMode = this.bookingForm.tourInfoForm.isCustomizeMode();

        if (isCustomizeMode) {
            const locationSection = dayElement.querySelector(".location-section");
            if (locationSection) {
                const paxSection = this.createPaxSectionForDay(dayNumber);
                locationSection.insertAdjacentHTML("beforebegin", paxSection);
            }
        }
    }

    createPaxSectionForDay(dayNumber) {
        return `
            <div class="form-group pax-section-day" id="paxSection-${dayNumber}">
                <div class="pax-section-day-title">
                    <p class="title-left">Pax quantity <strong>*</strong> </p>
                    <p class="title-right">Number of pax on tour: <span id="totalPax-${dayNumber}">0 pax</span></p>
                </div>
                <div class="pax-controls-day">
                    <div class="age-group">
                        <div class="age-label">
                            <span>Adults (13+ years)</span>
                        </div>
                        <div class="quantity-controls">
                            <button type="button" class="qty-btn minus" data-target="adults-${dayNumber}">-</button>
                            <input type="number" id="adults-${dayNumber}" name="adults-${dayNumber}" value="0" min="0" readonly>
                            <p class="quantity-number" data-target="adults-${dayNumber}">0</p>
                            <button type="button" class="qty-btn plus" data-target="adults-${dayNumber}">+</button>
                        </div>
                        <!-- ✅ ADDED: Error message for adults field -->
                        <span class="error-message" data-field="adults"></span>
                    </div>
                    <div class="age-group">
                        <div class="age-label">
                            <span>Children (1-3 years) - Free</span>
                        </div>
                        <div class="quantity-controls">
                            <button type="button" class="qty-btn minus" data-target="children1-${dayNumber}">-</button>
                            <input type="number" id="children1-${dayNumber}" name="children1-${dayNumber}" value="0" min="0" readonly>
                            <p class="quantity-number" data-target="children1-${dayNumber}">0</p>
                            <button type="button" class="qty-btn plus" data-target="children1-${dayNumber}">+</button>
                        </div>
                    </div>
                    <div class="age-group">
                        <div class="age-label">
                            <span>Children (4-6 years) - 60%</span>
                        </div>
                        <div class="quantity-controls">
                            <button type="button" class="qty-btn minus" data-target="children2-${dayNumber}">-</button>
                            <input type="number" id="children2-${dayNumber}" name="children2-${dayNumber}" value="0" min="0" readonly>
                            <p class="quantity-number" data-target="children2-${dayNumber}">0</p>
                            <button type="button" class="qty-btn plus" data-target="children2-${dayNumber}">+</button>
                        </div>
                    </div>
                    <div class="age-group">
                        <div class="age-label">
                            <span>Children (7-9 years) - 80%</span>
                        </div>
                        <div class="quantity-controls">
                            <button type="button" class="qty-btn minus" data-target="children3-${dayNumber}">-</button>
                            <input type="number" id="children3-${dayNumber}" name="children3-${dayNumber}" value="0" min="0" readonly>
                            <p class="quantity-number" data-target="children3-${dayNumber}">0</p>
                            <button type="button" class="qty-btn plus" data-target="children3-${dayNumber}">+</button>
                        </div>
                    </div>
                </div>
                
                <!-- ✅ ADDED: Error message for total pax field -->
                <span class="error-message" data-field="totalPax"></span>
            </div>
        `;
    }

    hideProgressiveSections(dayElement) {
        const sectionsToHide = [
            ".itinerary-section",
            ".vehicle-section",
            ".guide-section",
            ".food-section",
            ".hotel-section",
            ".services-section",
        ];

        sectionsToHide.forEach((selector) => {
            const section = dayElement.querySelector(selector);
            if (section) {
                section.style.display = "none";
                section.classList.add("progressive-section");
            }
        });
    }

    setTemplateAttributes(dayElement, dayNumber) {
        const elements = [
            {
                selector: ".no-service-checkbox",
                id: `noService-${dayNumber}`,
                attrs: { "data-day": dayNumber },
            },
            {
                selector: ".city-search",
                id: `city-${dayNumber}`,
                name: `city-${dayNumber}`,
            },
            { selector: ".city-dropdown", id: `cityDropdown-${dayNumber}` },
            {
                selector: ".tour-type-search",
                id: `tourType-${dayNumber}`,
                name: `tourType-${dayNumber}`,
            },
            { selector: ".tour-type-dropdown", id: `tourTypeDropdown-${dayNumber}` },
            { selector: ".tour-cards", id: `tourCards-${dayNumber}` },
            { selector: ".room-count", id: `roomCount-${dayNumber}` },
            { selector: ".hotel-options", id: `hotelOptions-${dayNumber}` },
            { selector: ".hotel-gallery", id: `hotelGallery-${dayNumber}` },
            { selector: ".day-content", id: `dayContent-${dayNumber}` },
            { selector: ".day-collapsed", id: `dayCollapsed-${dayNumber}` },
            {
                selector: ".guide-search",
                id: `guide-${dayNumber}`,
                name: `guide-${dayNumber}`,
            },
            { selector: ".guide-dropdown", id: `guideDropdown-${dayNumber}` },
        ];

        elements.forEach(({ selector, id, name, attrs }) => {
            const element = dayElement.querySelector(selector);
            if (element) {
                if (id) element.id = id;
                if (name) element.name = name;
                if (attrs) {
                    Object.entries(attrs).forEach(([attr, value]) => {
                        element.setAttribute(attr, value);
                    });
                }
            }
        });

        // Set ID for day validation error
        const dayValidationError = dayElement.querySelector(".day-validation-error");
        if (dayValidationError) {
            dayValidationError.id = `dayValidationError-${dayNumber}`;
        }

        // Set radio button names
        dayElement.querySelectorAll(".location-radio").forEach((radio) => {
            radio.name = `location-${dayNumber}`;
        });

        dayElement.querySelectorAll(".itinerary-radio").forEach((radio) => {
            radio.name = `itinerary-${dayNumber}`;
        });

        dayElement.querySelectorAll(".food-radio").forEach((radio) => {
            radio.name = `food-${dayNumber}`;
        });

        dayElement.querySelectorAll(".hotel-radio").forEach((radio) => {
            radio.name = `hotel-${dayNumber}`;
        });

        dayElement.querySelectorAll(".extra-bed-radio").forEach((radio) => {
            radio.name = `extra-bed-${dayNumber}`;
        });

        // Update service checkboxes name attributes for dynamic days
        dayElement
            .querySelectorAll(".services-section input[type='checkbox']")
            .forEach((checkbox) => {
                // Extract service name from value or class (e.g., "visa-checkbox" -> "visa")
                const serviceName =
                    checkbox.value || checkbox.className.replace("-checkbox", "");
                checkbox.name = `${serviceName}-${dayNumber}`;
            });

        // Set other elements
        const extraBedInputGroup = dayElement.querySelector(
            ".extra-bed-input-group"
        );
        if (extraBedInputGroup) {
            extraBedInputGroup.id = `extraBedInputGroup-${dayNumber}`;
        }

        const extraBedCount = dayElement.querySelector(".extra-bed-count");
        if (extraBedCount) {
            extraBedCount.id = `extraBedCount-${dayNumber}`;
        }

        dayElement.querySelectorAll(".room-btn").forEach((btn) => {
            btn.setAttribute("data-day", dayNumber);
        });

        dayElement.querySelectorAll(".extra-bed-btn").forEach((btn) => {
            btn.setAttribute("data-day", dayNumber);
        });

        dayElement
            .querySelectorAll(".confirm-day-btn, .see-detail-btn")
            .forEach((btn) => {
                btn.setAttribute("data-day", dayNumber);
            });

        const totalPriceDay = dayElement.querySelector(".total-price-day");
        if (totalPriceDay) {
            totalPriceDay.id = `totalPriceDay-${dayNumber}`;
        }
    }

    initDayEvents(dayNumber, dayElement = null) {
        // No service checkbox
        const noServiceCheckbox = dayElement
            ? dayElement.querySelector(`#noService-${dayNumber}`)
            : document.getElementById(`noService-${dayNumber}`);

        if (noServiceCheckbox) {
            noServiceCheckbox.addEventListener("change", (e) => {
                this.toggleNoService(dayNumber, e.target.checked);
            });
        }

        // Location selection
        const locationRadios = dayElement
            ? dayElement.querySelectorAll(`input[name="location-${dayNumber}"]`)
            : document.querySelectorAll(`input[name="location-${dayNumber}"]`);
        locationRadios.forEach((radio) => {
            radio.addEventListener("change", () => {
                this.handleLocationChange(dayNumber, radio.value);
            });
        });

        // City search
        const citySearch = dayElement
            ? dayElement.querySelector(`#city-${dayNumber}`)
            : document.getElementById(`city-${dayNumber}`);

        if (citySearch) {
            citySearch.addEventListener("focus", () => {
                this.showAllCities(dayNumber);
            });
            // ✅ FIXED: Check if user is clicking inside dropdown before closing
            citySearch.addEventListener("blur", () => {
                setTimeout(() => {
                    const dropdown = document.getElementById(`cityDropdown-${dayNumber}`);
                    const activeElement = document.activeElement;

                    if (
                        dropdown &&
                        !dropdown.contains(activeElement) &&
                        !activeElement?.classList.contains("city-search-input")
                    ) {
                        dropdown.style.display = "none";
                    }
                }, 200);
            });
        }

        // Tour type search
        const tourTypeSearch = dayElement
            ? dayElement.querySelector(`#tourType-${dayNumber}`)
            : document.getElementById(`tourType-${dayNumber}`);

        if (tourTypeSearch) {
            tourTypeSearch.addEventListener("focus", () => {
                this.showAllTourTypes(dayNumber);
            });
            // ✅ FIXED: Check if user is clicking inside dropdown before closing
            tourTypeSearch.addEventListener("blur", () => {
                setTimeout(() => {
                    const dropdown = document.getElementById(
                        `tourTypeDropdown-${dayNumber}`
                    );
                    const activeElement = document.activeElement;

                    if (
                        dropdown &&
                        !dropdown.contains(activeElement) &&
                        !activeElement?.classList.contains("tourtype-search-input")
                    ) {
                        dropdown.style.display = "none";
                    }
                }, 200);
            });
        }

        // Room controls
        const roomMinusBtn = dayElement
            ? dayElement.querySelector(`.room-btn.minus[data-day="${dayNumber}"]`)
            : document.querySelector(`.room-btn.minus[data-day="${dayNumber}"]`);
        const roomPlusBtn = dayElement
            ? dayElement.querySelector(`.room-btn.plus[data-day="${dayNumber}"]`)
            : document.querySelector(`.room-btn.plus[data-day="${dayNumber}"]`);

        if (roomMinusBtn)
            roomMinusBtn.addEventListener("click", () =>
                this.updateRoomCount(dayNumber, -1)
            );
        if (roomPlusBtn)
            roomPlusBtn.addEventListener("click", () =>
                this.updateRoomCount(dayNumber, 1)
            );

        // Guide search
        const guideSearch = dayElement
            ? dayElement.querySelector(`#guide-${dayNumber}`)
            : document.getElementById(`guide-${dayNumber}`);

        if (guideSearch) {
            guideSearch.addEventListener("focus", () => {
                this.showAllGuides(dayNumber);
            });
            guideSearch.addEventListener("blur", () => {
                setTimeout(() => {
                    const dropdown = document.getElementById(
                        `guideDropdown-${dayNumber}`
                    );
                    const activeElement = document.activeElement;

                    if (
                        dropdown &&
                        !dropdown.contains(activeElement) &&
                        !activeElement?.classList.contains("dropdown-search-input")
                    ) {
                        dropdown.style.display = "none";
                    }
                }, 150);
            });
        }

        // Day-specific pax controls (for customize mode)
        this.initDayPaxControls(dayNumber, dayElement);

        // Initialize food and services events
        setTimeout(() => {
            this.initFoodEvents(dayNumber);
            this.initServicesEvents(dayNumber);

            // ✅ ADDED: Handle search from dropdown search boxes
            this.initDropdownSearchEvents(dayNumber);
        }, 300);

        // Confirm day button
        const confirmBtn = dayElement
            ? dayElement.querySelector(`.confirm-day-btn[data-day="${dayNumber}"]`)
            : document.querySelector(`.confirm-day-btn[data-day="${dayNumber}"]`);

        if (confirmBtn) {
            confirmBtn.addEventListener("click", (e) => {
                console.log('tttttt')
                e.preventDefault();
                e.stopPropagation();

                // Kiểm tra trạng thái hiện tại của button
                const isCollapsed = confirmBtn.textContent.includes("See Detail");
                const overlay = document.querySelector(`#day-${dayNumber} .overlay`);

                const locationSection = document.querySelector(
                    `#day-${dayNumber} .location-section`
                );
                const badge = document.querySelector(
                    `#day-${dayNumber} .confirm-badge`
                );
                if (isCollapsed) {
                    // Nếu đang collapsed, expand lại
                    this.expandDay(dayNumber);
                    overlay.style.display = "none";
                    locationSection.style.pointerEvents = "auto";
                    confirmBtn.style.position = "static";
                    confirmBtn.style.bottom = "0";
                    confirmBtn.style.left = "0";
                    confirmBtn.style.width = "100%";
                    confirmBtn.style.zIndex = "10";
                    confirmBtn.style.transform = "none";
                    badge.style.visibility = "hidden";
                    badge.style.opacity = "0";
                } else {
                    // Nếu đang expanded, chỉ xác nhận và collapse nếu validate thành công
                    const beforeConfirmed = this.dailyPlans[dayNumber]?.confirmed;
                    const result = this.confirmDay(dayNumber);
                    // confirmDay sẽ chỉ collapse nếu validate thành công
                    // Nếu validate lỗi, không collapse, không đổi style
                    // Nếu validate thành công, confirmDay sẽ tự collapse và đổi style
                }
            });
        }

        // See detail button (will be added after collapse)
        setTimeout(() => {
            const seeDetailBtn = document.querySelector(
                `.see-detail-btn[data-day="${dayNumber}"]`
            );
            if (seeDetailBtn) {
                seeDetailBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.expandDay(dayNumber);
                });
            }
        }, 100);
    }

    initDayPaxControls(dayNumber, dayElement) {
        const paxButtons = dayElement
            ? dayElement.querySelectorAll(
                `[data-target^="adults-${dayNumber}"], [data-target^="children1-${dayNumber}"], [data-target^="children2-${dayNumber}"], [data-target^="children3-${dayNumber}"]`
            )
            : document.querySelectorAll(
                `[data-target^="adults-${dayNumber}"], [data-target^="children1-${dayNumber}"], [data-target^="children2-${dayNumber}"], [data-target^="children3-${dayNumber}"]`
            );

        paxButtons.forEach((button) => {
            button.addEventListener("click", (e) => {
                e.preventDefault();
                const target = button.dataset.target;
                const input = document.getElementById(target);
                const isPlus = button.classList.contains("plus");
                const currentValue = Number.parseInt(input.value) || 0;
                const currentQtyDisplay = document.querySelector(
                    `.quantity-number[data-target="${target}"]`
                );

                if (isPlus) {
                    input.value = currentValue + 1;
                    currentQtyDisplay.textContent = currentValue + 1;
                } else if (currentValue > 0) {
                    input.value = currentValue - 1;
                    currentQtyDisplay.textContent = currentValue - 1;
                }

                // ✅ ADDED: Hide pax errors when user changes values
                if (target.includes("adults")) {
                    this.hideFieldError(dayNumber, "adults");
                }
                this.hideFieldError(dayNumber, "totalPax");

                this.updateDayTotalPax(dayNumber);
            });
        });
    }

    updateDayTotalPax(dayNumber) {
        const dayPaxData = this.bookingForm.tourInfoForm.getDayPaxCount(dayNumber);
        const totalPaxElement = document.getElementById(`totalPax-${dayNumber}`);
        if (totalPaxElement) {
            totalPaxElement.textContent = `${dayPaxData.totalPax} pax`;
        }

        if (this.bookingForm.tourInfoForm.isCustomizeMode()) {
            this.bookingForm.tourInfoForm.updateSpecificDayInSidebar(dayNumber);

            // ✅ ADDED: Call vehicle API when pax changes
            const dayData = this.dailyPlans[dayNumber];
            if (dayData && dayData.selectedTour) {
                this.loadVehicleForDay(dayNumber, dayData.selectedTour);
            }
        }

        // ✅ ADDED: Reload coupons when pax changes
        const lotuscoupon = document.querySelector(".lotuscoupon");
        if (lotuscoupon && lotuscoupon.classList.contains("open")) {
            this.loadValidCoupons();
        }

        return dayPaxData.totalPax;
    }

    // Other methods will be added in the next parts...

    validateForm() {
        // Get total number of days
        const tourInfo = this.bookingForm.tourInfoForm
            ? this.bookingForm.tourInfoForm.getFormData()
            : {};
        const totalDays = tourInfo.days || 0;
        if (totalDays === 0) {
            return false;
        }

        // Check if all days are either confirmed or marked as no service
        const processedDays = [];
        const unprocessedDays = [];
        const unconfirmedDays = [];

        for (let dayNumber = 1; dayNumber <= totalDays; dayNumber++) {
            const dayData = this.dailyPlans[dayNumber];

            if (!dayData) {
                unprocessedDays.push(dayNumber);
                continue;
            }

            if (!dayData.confirmed && !dayData.noService) {
                unconfirmedDays.push(dayNumber);
                continue;
            }

            processedDays.push(dayNumber);
        }

        // Clear all validation errors only if there are no errors to show
        if (unprocessedDays.length === 0 && unconfirmedDays.length === 0) {
            this.clearAllValidationErrors();
        }

        // Show detailed error messages for each day using existing error elements
        if (unprocessedDays.length > 0) {
            unprocessedDays.forEach(dayNumber => {
                this.showDayValidationError(dayNumber, "Please complete all selections for this day.");
            });
            return false;
        }

        if (unconfirmedDays.length > 0) {
            unconfirmedDays.forEach(dayNumber => {
                this.showDayValidationError(dayNumber, "Please complete all selections for this day.");
            });
            return false;
        }
        return true;
    }

    getFormData() {
        // ✅ ADDED: Calculate total price with coupon discount
        let totalPrice = 0;
        const currentTotalPrice = this.calculateCurrentTotalPrice();
        if (this.selectedCoupon && this.discoutValue && this.discoutValue > 0) {
            const discountAmount = (currentTotalPrice * this.discoutValue) / 100;
            totalPrice = currentTotalPrice - discountAmount;
        } else {
            totalPrice = currentTotalPrice;
        }

        return {
            dailyPlans: this.dailyPlans,
            totalDays: Object.keys(this.dailyPlans).length,
            confirmedDays: Object.values(this.dailyPlans).filter(
                (day) => day.confirmed
            ).length,
            freeDays: Object.values(this.dailyPlans).filter((day) => day.noService)
                .length,
            // ✅ ADDED: Include coupon information
            coupon: {
                discountValue: this.discoutValue,
                couponCode: this.couponCode,
                selectedCoupon: this.selectedCoupon,
                indexDiscout: this.indexDiscout,
            },
            // ✅ ADDED: Include total price with discount
            totalPrice: totalPrice,
            originalTotalPrice: currentTotalPrice,
        };
    }

    updateSidebarTotalPrice() {
        const totalPriceSidebar =
            document.querySelector("#container__customize .total-row .total-price") ||
            document.querySelector(".total-price");

        if (totalPriceSidebar) {
            totalPriceSidebar.textContent = `$${this.grandTotal.toFixed(2)}`;
        }

        // ✅ ADDED: Update gift display when total price changes
        if (window.giftSelectionManager) {
            window.giftSelectionManager.updateGiftDisplay();
        }

        // ✅ ADDED: Update coupon and gift visibility when total price changes
        this.updateCouponAndGiftVisibility();
    }

    // ===== DAY MANAGEMENT METHODS =====

    toggleNoService(dayNumber, isNoService) {
        const dayContent = document.getElementById(`dayContent-${dayNumber}`);
        const dayData = this.dailyPlans[dayNumber] || {};

        if (isNoService) {
            // Hide all content sections
            if (dayContent) {
                dayContent.style.display = "none";
            }

            // Mark day as no service
            this.dailyPlans[dayNumber] = {
                ...dayData,
                noService: true,
                confirmed: false,
            };

            // Create hidden input for no service
            this.createHiddenInput(dayNumber, "noService", "true");
        } else {
            // Show content sections
            if (dayContent) {
                dayContent.style.display = "block";
            }

            // Remove no service flag
            if (this.dailyPlans[dayNumber]) {
                delete this.dailyPlans[dayNumber].noService;
                this.removeHiddenInput(dayNumber, "noService");
            }
        }

        this.saveDayData(dayNumber);
        this.updateSidebarForDay(dayNumber);
    }

    // ✅ ADDED: Handle location change with special logic for Phu Quoc
    handleLocationChange(dayNumber, region) {
        const citySection = document.querySelector(`#day-${dayNumber} .city-section`);
        const citySearch = document.getElementById(`city-${dayNumber}`);
        const cityDropdown = document.getElementById(`cityDropdown-${dayNumber}`);

        // Lấy radio đang được chọn
        const checkedRegionRadio = document.querySelector(`input[name="location-${dayNumber}"]:checked`);
        const regionSlug = checkedRegionRadio ? checkedRegionRadio.value : '';
        const regionLabel = checkedRegionRadio ? checkedRegionRadio.getAttribute('data-label') : '';

        // Check if selected region is Phu Quoc (dùng value động)
        // Điều kiện: nếu là radio cuối cùng hoặc label là 'Phú Quốc' hoặc '富國島'...
        const allRegionRadios = document.querySelectorAll(`input[name="location-${dayNumber}"]`);
        const isLastRadio = checkedRegionRadio === allRegionRadios[allRegionRadios.length - 1];
        const isPhuQuoc = isLastRadio || /phu quoc|phú quốc|富國島|phu-quoc/i.test(regionLabel);

        if (isPhuQuoc) {
            // Hide city section for Phu Quoc
            if (citySection) {
                citySection.style.display = 'none';
            }

            // Clear city data and show tour section directly
            if (citySearch) {
                citySearch.value = '';
                citySearch.dataset.value = '';
            }

            // Save location data, dùng value/label của radio
            this.saveDayData(dayNumber, {
                location: regionSlug,
                city: regionSlug,
                cityLabel: regionLabel,
            });

            // Show tour section directly
            this.showProgressiveSection(dayNumber, ".tour-section");

            // Hide city error if any
            this.hideFieldError(dayNumber, "city");
        } else {
            // Show city section for other regions
            if (citySection) {
                citySection.style.display = 'flex';
            }

            // Load cities for selected region
            this.updateCityOptions(dayNumber, region);
        }
    }

    async updateCityOptions(dayNumber, region) {
        const cityDropdown = document.getElementById(`cityDropdown-${dayNumber}`);
        const citySearch = document.getElementById(`city-${dayNumber}`);

        if (!cityDropdown) return;

        try {
            cityDropdown.innerHTML = '<div class="loading">Loading cities...</div>';

            // ✅ ADDED: Get language from window._LANG or use default
            const currentLang = window._LANG || "en";
            const cities = await this.regionCityManager.loadCitiesForRegion(region, currentLang);

            // Clear dropdown and add search box first
            cityDropdown.innerHTML = `
                <div class="search-box">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="21" viewBox="0 0 20 21" fill="none">
                        <path d="M9.58366 17.9998C13.9559 17.9998 17.5003 14.4554 17.5003 10.0832C17.5003 5.71092 13.9559 2.1665 9.58366 2.1665C5.2114 2.1665 1.66699 5.71092 1.66699 10.0832C1.66699 14.4554 5.2114 17.9998 9.58366 17.9998Z" stroke="#292D32" stroke-opacity="0.25" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"></path>
                        <path d="M18.3337 18.8332L16.667 17.1665" stroke="#292D32" stroke-opacity="0.25" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                    <input type="text" placeholder="Enter the city you want" class="city-search-input">
                </div>
            `;

            // Add search functionality
            const searchInput = cityDropdown.querySelector(".city-search-input");
            if (searchInput) {
                searchInput.addEventListener("input", (e) => {
                    this.searchCities(dayNumber, e.target.value);
                });
            }

            // Add city options
            cities.forEach((city) => {
                const option = document.createElement("div");
                option.className = "dropdown-option";
                option.textContent = city.label;
                option.dataset.value = city.value;

                option.addEventListener("click", () => {
                    citySearch.value = city.label;
                    citySearch.dataset.value = city.value;
                    cityDropdown.style.display = "none";

                    // ✅ ADDED: Hide city error when selected
                    this.hideFieldError(dayNumber, "city");

                    // Save location data
                    this.saveDayData(dayNumber, {
                        location: region,
                        city: city.value,
                        cityLabel: city.label,
                    });

                    // ✅ ADDED: Load tours if tour type is already selected
                    const dayData = this.dailyPlans[dayNumber] || {};
                    if (dayData.tourType && city.value) {
                        this.loadToursForDay(dayNumber, city.value, dayData.tourType);
                    }

                    // Show next section after city selection
                    this.showProgressiveSection(dayNumber, ".tour-section");
                });

                cityDropdown.appendChild(option);
            });

            // Store region data
            this.saveDayData(dayNumber, { location: region });
        } catch (error) {
            console.error("Error loading cities:", error);
            cityDropdown.innerHTML = '<div class="error">Error loading cities</div>';
        }
    }

    showAllCities(dayNumber) {
        const cityDropdown = document.getElementById(`cityDropdown-${dayNumber}`);
        if (cityDropdown) {
            cityDropdown.style.display = "block";
        }
    }

    searchCities(dayNumber, query) {
        const cityDropdown = document.getElementById(`cityDropdown-${dayNumber}`);
        if (!cityDropdown) return;

        const options = cityDropdown.querySelectorAll(".dropdown-option");
        let visibleCount = 0;

        options.forEach((option) => {
            const text = option.textContent.toLowerCase();
            const matches = text.includes(query.toLowerCase());

            // Show/hide option based on search
            option.style.display = matches ? "block" : "none";
            if (matches) visibleCount++;
        });

        // Show/hide no results message
        let noResultsMessage = cityDropdown.querySelector(".no-results-message");
        if (!noResultsMessage) {
            noResultsMessage = document.createElement("div");
            noResultsMessage.className = "no-results-message";
            noResultsMessage.textContent = "No cities found";
            noResultsMessage.style.cssText = `
                padding: 16px 20px;
                text-align: center;
                color: #94a3b8;
                font-style: italic;
                font-size: 14px;
                display: none;
                background: #f8fafc;
                border-top: 1px solid #e2e8f0;
            `;
            cityDropdown.appendChild(noResultsMessage);
        }

        noResultsMessage.style.display = visibleCount === 0 ? "block" : "none";
    }

    showAllTourTypes(dayNumber) {
        const tourTypeDropdown = document.getElementById(
            `tourTypeDropdown-${dayNumber}`
        );
        if (!tourTypeDropdown) return;

        // Get tour types from template
        const template = document.getElementById("daily-plan-template");
        if (!template) return;

        const tourTypeOptions = template.content.querySelectorAll(
            ".tour-type-dropdown .dropdown-option"
        );

        // Clear dropdown and add search box first
        tourTypeDropdown.innerHTML = `
            <div class="search-box">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="21" viewBox="0 0 20 21" fill="none">
                    <path d="M9.58366 17.9998C13.9559 17.9998 17.5003 14.4554 17.5003 10.0832C17.5003 5.71092 13.9559 2.1665 9.58366 2.1665C5.2114 2.1665 1.66699 5.71092 1.66699 10.0832C1.66699 14.4554 5.2114 17.9998 9.58366 17.9998Z" stroke="#292D32" stroke-opacity="0.25" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"></path>
                    <path d="M18.3337 18.8332L16.667 17.1665" stroke="#292D32" stroke-opacity="0.25" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
                <input type="text" placeholder="Enter the tour type you want" class="tourtype-search-input">
            </div>
        `;

        // Add search functionality
        const searchInput = tourTypeDropdown.querySelector(
            ".tourtype-search-input"
        );
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                this.searchTourTypes(dayNumber, e.target.value);
            });
        }

        // Add tour type options
        Array.from(tourTypeOptions).forEach((templateOption) => {
            const option = templateOption.cloneNode(true);
            option.addEventListener("click", () => {
                const tourTypeSearch = document.getElementById(`tourType-${dayNumber}`);
                tourTypeSearch.value = option.textContent.replace(/\s+/g, ' ').trim();
                tourTypeSearch.dataset.value = option.dataset.value;
                tourTypeDropdown.style.display = "none";
                // Save tour type data and load tours
                this.handleTourTypeSelection(
                    dayNumber,
                    option.dataset.value,
                    option.textContent.replace(/\s+/g, ' ').trim()
                );
            });

            tourTypeDropdown.appendChild(option);
        });

        tourTypeDropdown.style.display = "block";
    }

    searchTourTypes(dayNumber, query) {
        const tourTypeDropdown = document.getElementById(
            `tourTypeDropdown-${dayNumber}`
        );
        if (!tourTypeDropdown) return;

        const options = tourTypeDropdown.querySelectorAll(".dropdown-option");
        let visibleCount = 0;

        options.forEach((option) => {
            const text = option.textContent.toLowerCase();
            const matches = text.includes(query.toLowerCase());

            // Show/hide option based on search
            option.style.display = matches ? "block" : "none";
            if (matches) visibleCount++;
        });

        // Show/hide no results message
        let noResultsMessage = tourTypeDropdown.querySelector(
            ".no-results-message"
        );
        if (!noResultsMessage) {
            noResultsMessage = document.createElement("div");
            noResultsMessage.className = "no-results-message";
            noResultsMessage.textContent = "No tour types found";
            noResultsMessage.style.cssText = `
                padding: 16px 20px;
                text-align: center;
                color: #94a3b8;
                font-style: italic;
                font-size: 14px;
                display: none;
                background: #f8fafc;
                border-top: 1px solid #e2e8f0;
            `;
            tourTypeDropdown.appendChild(noResultsMessage);
        }

        noResultsMessage.style.display = visibleCount === 0 ? "block" : "none";
    }

    async handleTourTypeSelection(dayNumber, tourTypeValue, tourTypeLabel) {
        const dayData = this.dailyPlans[dayNumber] || {};

        // ✅ ADDED: Hide tour type error when selected
        this.hideFieldError(dayNumber, "tourType");

        // Save tour type data
        this.saveDayData(dayNumber, {
            tourType: tourTypeValue,
            tourTypeLabel: tourTypeLabel,
        });

        // Load tours if both city and tour type are selected
        if (dayData.city && tourTypeValue) {
            await this.loadToursForDay(dayNumber, dayData.city, tourTypeValue);
        }
    }

    async loadToursForDay(dayNumber, destination, tourType) {
        const tourCardsContainer = document.getElementById(
            `tourCards-${dayNumber}`
        );
        if (!tourCardsContainer) return;

        try {
            tourCardsContainer.innerHTML =
                '<div class="loading-tours">Loading tours...</div>';

            // ✅ ADDED: Get language from window._LANG or use default
            const currentLang = window._LANG || "en";
            const tours = await this.tourManager.fetchToursFromAPI(
                destination,
                tourType,
                currentLang
            );

            this.renderTourCards(dayNumber, tours);
            this.showProgressiveSection(dayNumber, ".tour-section");
        } catch (error) {
            console.error("Error loading tours:", error);
            tourCardsContainer.innerHTML =
                '<div class="error">Error loading tours</div>';
        }
    }

    renderTourCards(dayNumber, tours) {
        const tourCardsContainer = document.getElementById(
            `tourCards-${dayNumber}`
        );
        if (!tourCardsContainer) return;

        tourCardsContainer.innerHTML = "";

        if (!tours || tours.length === 0) {
            const notFound = document.createElement('div');
            notFound.className = 'tour-not-found';
            notFound.textContent = 'Not found tour';
            tourCardsContainer.appendChild(notFound);
            return;
        }

        tours.forEach((tour, index) => {
            const tourCard = document.createElement("div");
            tourCard.className = "tour-card";
            tourCard.dataset.tourId = tour.id;
            tourCard.dataset.day = dayNumber;

            if (index === 0) {
                tourCard.classList.add("selected");
                // Auto-select first tour
                this.selectTour(dayNumber, tour);
            }

            tourCard.innerHTML = `
                <div class="tour-image">
                    <img src="${tour.image}" alt="${tour.name}">
                </div>
                <div class="tour-info">
                      <h4 class="tour-title">${tour.name}</h4>
                      <div class="tour-meta">
                          <p class="tour-departure">Departure: <span>Hanoi</span></p>
                              <p class="tour-type">Type: <span>${tour.type || "Guided Tour"
                }</span></p>
                      </div>
                  </div>
                  <div class="tour-taxonomy">
                            ${(tour.services || [])
                    .map(
                        (service) =>
                            `<p class="service-taxonomy">${service}</p>`
                    )
                    .join("")}
                    </div>
            `;

            tourCard.addEventListener("click", () => {
                this.handleTourSelection(dayNumber, tour, tourCard);
            });

            tourCardsContainer.appendChild(tourCard);
        });
    }

    handleTourSelection(dayNumber, tour, tourCard) {
        // Remove selection from other cards
        const otherCards = document.querySelectorAll(
            `#tourCards-${dayNumber} .tour-card`
        );
        otherCards.forEach((card) => card.classList.remove("selected"));

        // Select current card
        tourCard.classList.add("selected");

        // Save tour data
        this.selectTour(dayNumber, tour);

        // Show next sections
        this.showProgressiveSection(dayNumber, ".itinerary-section");
    }

    selectTour(dayNumber, tour) {
        // ✅ ADDED: Hide tour section error when tour is selected
        const tourSection = document.querySelector(
            `#day-${dayNumber} .tour-section`
        );
        if (tourSection) {
            const sectionError = tourSection.querySelector(".section-error");
            if (sectionError) {
                sectionError.remove();
            }
        }

        this.saveDayData(dayNumber, {
            selectedTour: tour.id,
            selectedTourData: tour,
        });

        // Auto-load vehicle options
        this.loadVehicleForDay(dayNumber, tour.id);

        // ✅ ADDED: Auto-load hotel options for the selected tour
        this.loadHotelsForDay(dayNumber);

        // Update pricing
        this.calculateDayTotal(dayNumber);
        this.displayDayTotalPrice(dayNumber);

        // Update sidebar to show tour name
        this.updateSidebarForDay(dayNumber);
    }

    async loadVehicleForDay(dayNumber, tourId) {
        try {
            const paxCount = this.getDayPaxCount(dayNumber);

            // Load both standard and VIP vehicle options
            const [standardVehicle, vipVehicle] = await Promise.all([
                this.vehicleManager.fetchVehicle(paxCount.totalPax, "standard", tourId),
                this.vehicleManager.fetchVehicle(paxCount.totalPax, "vip", tourId),
            ]);

            // Update itinerary section with vehicle info
            this.renderItineraryOptions(dayNumber, standardVehicle, vipVehicle);
            this.showProgressiveSection(dayNumber, ".itinerary-section");

            // Auto-select standard by default
            this.selectItinerary(dayNumber, "standard", standardVehicle);
        } catch (error) {
            console.error("Error loading vehicle:", error);
        }
    }

    renderItineraryOptions(dayNumber, standardVehicle, vipVehicle) {
        const itinerarySection = document.querySelector(
            `#day-${dayNumber} .itinerary-options`
        );
        if (!itinerarySection) return;

        const paxCount = this.getDayPaxCount(dayNumber);

        itinerarySection.innerHTML = `
            <label class="itinerary-option selected">
                <input type="radio" name="itinerary-${dayNumber}" value="standard" checked>
                <span class="radio-custom"></span>
                <div class="itinerary-details">
                    <p class="itinerary-title">Standard car</p>
                </div>
            </label>
            <label class="itinerary-option">
                <input type="radio" name="itinerary-${dayNumber}" value="vip">
                <span class="radio-custom"></span>
                <div class="itinerary-details">
                    <p class="itinerary-title">VIP Car </p>
                </div>
            </label>
        `;

        // Add event listeners
        const itineraryRadios = itinerarySection.querySelectorAll(
            `input[name="itinerary-${dayNumber}"]`
        );
        itineraryRadios.forEach((radio) => {
            radio.addEventListener("change", () => {
                const vehicleData =
                    radio.value === "standard" ? standardVehicle : vipVehicle;
                this.selectItinerary(dayNumber, radio.value, vehicleData);

                // Update selected styling
                itinerarySection
                    .querySelectorAll(".itinerary-option")
                    .forEach((opt) => opt.classList.remove("selected"));
                radio.closest(".itinerary-option").classList.add("selected");
            });
        });
    }

    selectItinerary(dayNumber, itineraryType, vehicleData) {
        const paxCount = this.getDayPaxCount(dayNumber);
        const basePrice = parseInt(
            vehicleData?.price || (itineraryType === "vip" ? 0 : 0)
        );

        // Calculate price based on age groups
        const calculatedPrice = this.vehicleManager.calculatePriceByAge(
            basePrice,
            paxCount.totalPax,
            paxCount.adults,
            paxCount.children1,
            paxCount.children2,
            paxCount.children3
        );

        this.saveDayData(dayNumber, {
            itinerary: itineraryType,
            vehicle: {
                type: itineraryType,
                title: vehicleData?.title || `${itineraryType} Vehicle`,
                basePrice: basePrice,
                calculatedPrice: calculatedPrice,
                gallery: vehicleData?.gallery || [],
            },
        });

        // Update vehicle images section
        this.updateVehicleImages(dayNumber, vehicleData);

        // Show next sections
        this.showProgressiveSection(dayNumber, ".vehicle-section");
        this.showProgressiveSection(dayNumber, ".guide-section");

        // Update pricing
        this.calculateDayTotal(dayNumber);
        this.displayDayTotalPrice(dayNumber);
    }

    updateVehicleImages(dayNumber, vehicleData) {
        const vehicleSection = document.querySelector(
            `#day-${dayNumber} .vehicle-section`
        );
        if (!vehicleSection) return;

        const titleElement = vehicleSection.querySelector("h3");
        const subtitleElement = vehicleSection.querySelector(".section-subtitle");
        const imagesContainer = vehicleSection.querySelector(".vehicle-images");

        if (titleElement) {
            titleElement.textContent = `Images for ${vehicleData?.title || "Selected Vehicle"
                }`;
        }

        if (subtitleElement) {
            const paxCount = this.getDayPaxCount(dayNumber);
            subtitleElement.innerHTML = `Suitable for tour from: <strong>2 - ${paxCount.totalPax}pax</strong>`;
        }

        if (imagesContainer && vehicleData?.gallery) {
            imagesContainer.innerHTML = "";
            vehicleData.gallery.forEach((imageUrl, index) => {
                const img = document.createElement("img");
                img.src = imageUrl;
                img.alt = `Vehicle Image ${index + 1}`;
                imagesContainer.appendChild(img);
            });
        }
    }

    showAllGuides(dayNumber) {
        const guideDropdown = document.getElementById(`guideDropdown-${dayNumber}`);
        if (!guideDropdown) return;

        // ✅ Get guide options from HTML template instead of popup
        const template = document.getElementById("daily-plan-template");
        if (!template) return;

        const htmlGuideOptions = template.content.querySelectorAll(
            ".dropdown-options-container .dropdown-option"
        );

        // Clear dropdown and add search box first (same structure as city dropdown)
        guideDropdown.innerHTML = `
            <div class="search-box">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="21" viewBox="0 0 20 21" fill="none">
                    <path d="M9.58366 17.9998C13.9559 17.9998 17.5003 14.4554 17.5003 10.0832C17.5003 5.71092 13.9559 2.1665 9.58366 2.1665C5.2114 2.1665 1.66699 5.71092 1.66699 10.0832C1.66699 14.4554 5.2114 17.9998 9.58366 17.9998Z" stroke="#292D32" stroke-opacity="0.25" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"></path>
                    <path d="M18.3337 18.8332L16.667 17.1665" stroke="#292D32" stroke-opacity="0.25" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
                <input type="text" placeholder="Enter the guide you want" class="guide-search-input">
            </div>
        `;

        // Add search functionality
        const searchInput = guideDropdown.querySelector(".guide-search-input");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                this.searchGuides(dayNumber, e.target.value);
            });
        }

        // Add guide options from HTML template
        Array.from(htmlGuideOptions).forEach((templateOption) => {
            const option = templateOption.cloneNode(true);
            const guideText = option.textContent.trim();
            const guideValue = option.dataset.value;

            option.addEventListener("click", () => {
                const guideSearch = document.getElementById(`guide-${dayNumber}`);
                guideSearch.value = guideText;
                guideSearch.dataset.value = guideValue;
                guideDropdown.style.display = "none";

                // ✅ ADDED: Hide guide error when selected
                this.hideFieldError(dayNumber, "guide");

                this.saveDayData(dayNumber, {
                    guide: guideText,
                    guideValue: guideValue,
                });

                // Show next sections
                this.showProgressiveSection(dayNumber, ".food-section");
                this.showProgressiveSection(dayNumber, ".hotel-section");
                this.showProgressiveSection(dayNumber, ".services-section");

                // Auto-load hotel options and populate food data
                this.loadHotelsForDay(dayNumber);
                this.populateFoodDataFromAPI(dayNumber); // ✅ ADDED: Populate food data from API
            });

            guideDropdown.appendChild(option);
        });

        guideDropdown.style.display = "block";
    }

    updateRoomCount(dayNumber, change) {
        const roomCountElement = document.getElementById(`roomCount-${dayNumber}`);
        if (!roomCountElement) return;

        let currentCount = parseInt(roomCountElement.textContent) || 0;

        // Allow decreasing to 0 if user wants no hotel
        if (change < 0) {
            currentCount = Math.max(0, currentCount + change);
        } else {
            currentCount = currentCount + change;
        }

        roomCountElement.textContent = currentCount.toString().padStart(2, "0");

        // ✅ SỬA: Chỉ validate khi giảm room count, không validate khi tăng
        const extraBedCountElement = document.getElementById(`extraBedCount-${dayNumber}`);
        const currentExtraBeds = parseInt(extraBedCountElement?.textContent) || 0;

        // Chỉ validate khi giảm room và extrabed > room mới
        if (change < 0 && currentExtraBeds > currentCount) {
            this.validateExtraBedCountAgainstRooms(dayNumber, currentCount);
        }

        this.saveDayData(dayNumber, { roomCount: currentCount });

        // Update hotel prices if hotel is selected
        this.updateHotelPricing(dayNumber);

        // Recalculate total price
        this.calculateDayTotal(dayNumber);
        this.displayDayTotalPrice(dayNumber);
    }

    updateHotelPricing(dayNumber) {
        const hotelRadios = document.querySelectorAll(
            `input[name="hotel-${dayNumber}"]`
        );
        const roomCount =
            parseInt(
                document.getElementById(`roomCount-${dayNumber}`)?.textContent
            ) || 1;

        hotelRadios.forEach((radio) => {
            const label = radio.closest(".hotel-option");
            const priceElement = label?.querySelector(".hotel-room-count");
            if (priceElement) {
                priceElement.textContent = roomCount;
            }
        });
    }

    confirmDay(dayNumber) {
        console.log('confirmDay', dayNumber)
        const dayData = this.dailyPlans[dayNumber];

        // ✅ ADDED: Validate step 2 fields before confirming
        if (!this.validateDayFields(dayNumber)) {
            return; // Stop if validation fails
        }

        // ✅ ADDED: Validate adults count for customize mode
        if (this.bookingForm.tourInfoForm.isCustomizeMode()) {
            const dayPaxData =
                this.bookingForm.tourInfoForm.getDayPaxCount(dayNumber);

            if (dayPaxData.adults < 1) {
                this.showFieldError(
                    dayNumber,
                    "adults",
                    `Ngày ${dayNumber}: Cần chọn ít nhất 1 người lớn`
                );
                return;
            }
        }

        // Mark day as confirmed
        this.saveDayData(dayNumber, { confirmed: true });

        // Ensure all essential data is saved as hidden inputs before confirming
        this.ensureEssentialHiddenInputs(dayNumber);

        // Collapse day view
        this.collapseDay(dayNumber);

        // Update sidebar
        this.updateSidebarForDay(dayNumber);

        // ✅ ADDED: Update coupon and gift section visibility when day is confirmed
        this.updateCouponAndGiftVisibility();

        // Update step display to show summary-total and submit button
        if (this.bookingForm && this.bookingForm.updateStepDisplay) {
            this.bookingForm.updateStepDisplay();
        }
    }

    // ✅ ADDED: Validate required fields for a day
    validateDayFields(dayNumber) {
        this.clearDayErrors(dayNumber);
        let isValid = true;

        const dayData = this.dailyPlans[dayNumber];

        // Check if no service is selected
        const noServiceCheckbox = document.querySelector(
            `input[name="no-service-${dayNumber}"]:checked`
        );
        if (noServiceCheckbox) {
            return true; // No validation needed for no-service days
        }

        // ✅ ADDED: Validate pax for customize mode
        if (this.bookingForm.tourInfoForm.isCustomizeMode()) {
            const dayPaxData =
                this.bookingForm.tourInfoForm.getDayPaxCount(dayNumber);
            // Validate adults count
            if (dayPaxData.adults < 1) {
                this.showFieldError(
                    dayNumber,
                    "totalPax",
                    `Ngày ${dayNumber}: Please select at least 1 adult`
                );
                isValid = false;
            }
        }

        // Lấy radio location đang chọn
        const checkedRegionRadio = document.querySelector(`input[name="location-${dayNumber}"]:checked`);
        const regionSlug = checkedRegionRadio ? checkedRegionRadio.value : '';
        const regionLabel = checkedRegionRadio ? checkedRegionRadio.getAttribute('data-label') : '';

        // Nếu chọn Phú Quốc (radio cuối cùng)
        const locationRadios = document.querySelectorAll(`input[name="location-${dayNumber}"]`);
        const isPhuQuoc = checkedRegionRadio && (Array.from(locationRadios).indexOf(checkedRegionRadio) === locationRadios.length - 1);

        // Validate location
        if (!regionSlug) {
            this.showFieldError(dayNumber, "location", "Please select a region");
            isValid = false;
        }

        // Nếu KHÔNG phải Phú Quốc thì mới validate city
        if (!isPhuQuoc) {
            const cityInput = document.querySelector(`#day-${dayNumber} .city-search`);
            if (!cityInput || !cityInput.value.trim()) {
                this.showFieldError(dayNumber, "city", "Please select a city");
                isValid = false;
            }
        }

        // Nếu là Phú Quốc, luôn set city/cityLabel bằng value/label của radio location
        if (isPhuQuoc) {
            this.dailyPlans[dayNumber].city = regionSlug;
            this.dailyPlans[dayNumber].cityLabel = regionLabel;
        }

        // Validate tour type
        const tourTypeInput = document.querySelector(
            `#day-${dayNumber} .tour-type-search`
        );
        if (!tourTypeInput || !tourTypeInput.value.trim()) {
            this.showFieldError(dayNumber, "tourType", "Please select a tour type");
            isValid = false;
        }

        // Validate tour guide
        const guideInput = document.querySelector(
            `#day-${dayNumber} .guide-search`
        );
        if (!guideInput || !guideInput.value.trim()) {
            this.showFieldError(dayNumber, "guide", "Please select a guide");
            isValid = false;
        }

        // Validate selected tour
        if (!dayData || !dayData.selectedTour) {
            // Show error near tour section
            const tourSection = document.querySelector(
                `#day-${dayNumber} .tour-section`
            );
            if (tourSection) {
                this.showSectionError(tourSection, "Please select a tour");
            }
            isValid = false;
        }

        return isValid;
    }

    // ✅ ADDED: Show field error message
    showFieldError(dayNumber, fieldName, message) {
        const errorElement = document.querySelector(
            `#day-${dayNumber} [data-field="${fieldName}"]`
        );
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add("show");
        }
    }

    // ✅ ADDED: Show section error message
    showSectionError(sectionElement, message) {
        // Remove existing error
        const existingError = sectionElement.querySelector(".section-error");
        if (existingError) {
            existingError.remove();
        }

        // Create new error element
        const errorElement = document.createElement("div");
        errorElement.className = "section-error error-message show";
        errorElement.textContent = message;
        errorElement.style.cssText = `
            color: #ef4444;
            font-size: 0.75rem;
            margin-top: 0.5rem;
            padding: 0.5rem;
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 0.375rem;
        `;

        // Insert after section header
        const sectionHeader = sectionElement.querySelector(
            ".tour-header, .section-header"
        );
        if (sectionHeader) {
            sectionHeader.insertAdjacentElement("afterend", errorElement);
        }
    }

    // ✅ ADDED: Clear all errors for a day
    clearDayErrors(dayNumber) {
        const dayElement = document.getElementById(`day-${dayNumber}`);
        if (!dayElement) return;

        // Clear field errors
        const errorElements = dayElement.querySelectorAll(".error-message");
        errorElements.forEach((element) => {
            element.textContent = "";
            element.classList.remove("show");
        });

        // Clear section errors
        const sectionErrors = dayElement.querySelectorAll(".section-error");
        sectionErrors.forEach((error) => error.remove());

        // Clear day validation error
        const dayValidationError = document.getElementById(`dayValidationError-${dayNumber}`);
        if (dayValidationError) {
            dayValidationError.style.display = "none";
            dayValidationError.textContent = "";
        }
    }

    // ✅ ADDED: Show validation error for a specific day
    showDayValidationError(dayNumber, message) {
        const errorElement = document.getElementById(`dayValidationError-${dayNumber}`);
        if (!errorElement) return;

        // Update error message and show it
        errorElement.textContent = message;
        errorElement.style.display = "block";

        // Check if day content is visible, if not then expand without animation
        const dayContent = document.getElementById(`dayContent-${dayNumber}`);
        if (dayContent && (dayContent.style.display !== "block" || dayContent.style.opacity !== "1")) {
            this.expandDayForError(dayNumber);
        }
    }

    // ✅ ADDED: Clear all validation errors for all days
    clearAllValidationErrors() {
        const allDays = document.querySelectorAll("[id^='day-']");
        allDays.forEach(dayElement => {
            const dayValidationError = dayElement.querySelector(".day-validation-error");
            if (dayValidationError) {
                dayValidationError.style.display = "none";
                dayValidationError.textContent = "";
            }
        });
    }

    // ✅ ADDED: Expand day for error display (without clearing errors)
    expandDayForError(dayNumber) {
        const dayContent = document.getElementById(`dayContent-${dayNumber}`);
        const dayCollapsed = document.getElementById(`dayCollapsed-${dayNumber}`);
        const confirmBtn = document.querySelector(
            `.confirm-day-btn[data-day="${dayNumber}"]`
        );

        // Check if day is already expanded
        if (dayContent && dayContent.style.display === "block" && dayContent.style.opacity === "1") {
            return; // Day is already expanded, no need to animate
        }

        if (dayContent) {
            // Show content immediately without animation for error display
            dayContent.style.display = "block";
            dayContent.style.opacity = "1";
            dayContent.style.height = "auto";
            dayContent.style.overflow = "visible";
            dayContent.style.transition = "none"; // Disable transition for error display
        }

        if (dayCollapsed) {
            dayCollapsed.style.display = "none";
        }

        // Khôi phục text và style ban đầu của button
        if (confirmBtn) {
            confirmBtn.innerHTML = `
        Confirm service for this day
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="14" viewBox="0 0 17 14" fill="none">
          <path d="M2.08984 6.99658H15.2774" stroke="white" stroke-width="1.49167" stroke-linecap="round"
            stroke-linejoin="round" />
          <path d="M9.88281 1.60156L15.2778 6.99637L9.88281 12.3912" stroke="white" stroke-width="1.49167"
            stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      `;
            confirmBtn.style.background = "#d4a017"; // Khôi phục màu vàng ban đầu
            confirmBtn.style.height = "auto"; // Khôi phục chiều cao ban đầu
            confirmBtn.style.fontSize = "1rem"; // Khôi phục font size ban đầu
            confirmBtn.style.padding = "0.875rem 1.5rem"; // Khôi phục padding ban đầu
            confirmBtn.style.transition = "all 0.3s ease"; // Giữ transition cho button
        }

        // Mark as not confirmed to allow editing
        if (this.dailyPlans[dayNumber]) {
            this.dailyPlans[dayNumber].confirmed = false;
        }

        // Don't update UI when expanding for error display to avoid flickering
        // if (this.bookingForm && this.bookingForm.updateStepDisplay) {
        //     setTimeout(() => {
        //         this.bookingForm.updateStepDisplay();
        //     }, 100);
        // }
    }

    expandDay(dayNumber) {
        const dayContent = document.getElementById(`dayContent-${dayNumber}`);
        const dayCollapsed = document.getElementById(`dayCollapsed-${dayNumber}`);
        const confirmBtn = document.querySelector(
            `.confirm-day-btn[data-day="${dayNumber}"]`
        );

        // Clear validation errors when user expands day
        this.clearDayErrors(dayNumber);

        if (dayContent) {
            // Hiển thị content trước khi animation
            dayContent.style.display = "block";
            dayContent.style.opacity = "0";
            dayContent.style.height = "0";
            dayContent.style.overflow = "hidden";
            dayContent.style.transition = "height 0.3s ease, opacity 0.3s ease";

            // Trigger animation sau một chút
            setTimeout(() => {
                dayContent.style.height = "auto";
                dayContent.style.opacity = "1";
                dayContent.style.overflow = "visible";
            }, 10);
        }

        if (dayCollapsed) {
            dayCollapsed.style.display = "none";
        }

        // Khôi phục text và style ban đầu của button
        if (confirmBtn) {
            confirmBtn.innerHTML = `
        Confirm service for this day
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="14" viewBox="0 0 17 14" fill="none">
          <path d="M2.08984 6.99658H15.2774" stroke="white" stroke-width="1.49167" stroke-linecap="round"
            stroke-linejoin="round" />
          <path d="M9.88281 1.60156L15.2778 6.99637L9.88281 12.3912" stroke="white" stroke-width="1.49167"
            stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      `;
            confirmBtn.style.background = "#d4a017"; // Khôi phục màu vàng ban đầu
            confirmBtn.style.height = "auto"; // Khôi phục chiều cao ban đầu
            confirmBtn.style.fontSize = "1rem"; // Khôi phục font size ban đầu
            confirmBtn.style.padding = "0.875rem 1.5rem"; // Khôi phục padding ban đầu
            confirmBtn.style.transition = "all 0.3s ease"; // Giữ transition cho button
        }

        // Mark as not confirmed to allow editing
        if (this.dailyPlans[dayNumber]) {
            this.dailyPlans[dayNumber].confirmed = false;
        }

        // Update UI after expanding
        if (this.bookingForm && this.bookingForm.updateStepDisplay) {
            setTimeout(() => {
                this.bookingForm.updateStepDisplay();
            }, 100);
        }
    }

    collapseDay(dayNumber) {
        const dayContent = document.getElementById(`dayContent-${dayNumber}`);
        const dayCollapsed = document.getElementById(`dayCollapsed-${dayNumber}`);
        const overlay = document.querySelector(`#day-${dayNumber} .overlay`);
        const locationSection = document.querySelector(
            `#day-${dayNumber} .location-section`
        );
        const badge = document.querySelector(`#day-${dayNumber} .confirm-badge`);

        if (overlay) {
            overlay.style.display = "block";
            locationSection.style.pointerEvents = "none";
            badge.style.visibility = "visible";
            badge.style.opacity = "1";
        }

        const confirmBtn = document.querySelector(
            `.confirm-day-btn[data-day="${dayNumber}"]`
        );

        if (dayContent) {
            // Thêm animation cho việc collapse
            const currentHeight = dayContent.scrollHeight;
            dayContent.style.height = currentHeight + "px";
            dayContent.style.overflow = "hidden";
            dayContent.style.transition = "height 0.3s ease, opacity 0.3s ease";

            // Trigger animation
            setTimeout(() => {
                dayContent.style.height = "16.375rem";
                dayContent.style.position = "relative";
            }, 100);
        }

        if (dayCollapsed) {
            dayCollapsed.style.display = "block";
        }

        // Thay đổi text và style của button khi collapse
        if (confirmBtn) {
            confirmBtn.innerHTML = `
        See Detail
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="14" viewBox="0 0 17 14" fill="none">
          <path d="M2.08984 6.99658H15.2774" stroke="white" stroke-width="1.49167" stroke-linecap="round"
            stroke-linejoin="round" />
          <path d="M9.88281 1.60156L15.2778 6.99637L9.88281 12.3912" stroke="white" stroke-width="1.49167"
            stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      `;

            confirmBtn.style.position = "absolute";
            confirmBtn.style.bottom = "1.625rem";
            confirmBtn.style.left = "50%";
            confirmBtn.style.width = "95%";
            confirmBtn.style.zIndex = "10";
            confirmBtn.style.transform = "translateX(-50%)";
        }
    }

    // ===== HELPER METHODS =====

    getDayPaxCount(dayNumber) {
        if (this.bookingForm.tourInfoForm.isCustomizeMode()) {
            return this.bookingForm.tourInfoForm.getDayPaxCount(dayNumber);
        } else {
            return this.bookingForm.tourInfoForm.getTotalPaxCount();
        }
    }

    showProgressiveSection(dayNumber, sectionSelector) {
        const section = document.querySelector(
            `#day-${dayNumber} ${sectionSelector}`
        );
        if (section) {
            section.style.display = "block";
            section.classList.add("section-visible");
        }
    }

    saveDayData(dayNumber, newData = {}) {

        if (!this.dailyPlans[dayNumber]) {
            this.dailyPlans[dayNumber] = {};
        }

        Object.assign(this.dailyPlans[dayNumber], newData);

        // Create hidden inputs for data persistence
        Object.keys(newData).forEach((key) => {
            this.createHiddenInput(dayNumber, key, newData[key]);
        });

        // Ensure essential data is always saved as hidden inputs
        this.ensureEssentialHiddenInputs(dayNumber);
    }

    ensureEssentialHiddenInputs(dayNumber) {
        const dayData = this.dailyPlans[dayNumber];
        if (!dayData) {
            return;
        }

        // Always create hidden inputs for essential fields
        const essentialFields = {
            guide: dayData.guide || "English",
            food: dayData.food || "vietnamese",
            hotel: dayData.hotel || "lotus-economy",
            itinerary: dayData.itinerary || "standard",
        };

        // Add selectedTourData if available
        if (
            dayData.selectedTourData &&
            typeof dayData.selectedTourData === "object"
        ) {
            try {
                const tourDataJson = JSON.stringify(dayData.selectedTourData);
                this.createHiddenInput(dayNumber, "selectedTourData", tourDataJson);
            } catch (error) {
                console.error(
                    `❌ Error stringifying selectedTourData for day ${dayNumber}:`,
                    error
                );
            }
        }

        // Add other services if available
        if (
            dayData.services &&
            Array.isArray(dayData.services) &&
            dayData.services.length > 0
        ) {
            const serviceMap = {
                visa: "Visa",
                arrival: "Arrival fast track",
                departure: "Departure fast track",
                massage: "Massage",
                vietnamese: "Vietnamese hair wash",
                romantic: "Romantic dinner",
                party: "Party",
                photography: "Professional photography",
            };

            const otherServices = dayData.services.map(
                (service) => serviceMap[service] || service
            );

            this.createHiddenInput(
                dayNumber,
                "otherServices",
                otherServices.join(", ")
            );
        }

        // Create essential hidden inputs
        Object.entries(essentialFields).forEach(([key, value]) => {
            this.createHiddenInput(dayNumber, key, value);
        });
    }

    createHiddenInput(dayNumber, fieldName, value) {
        const formContainer = document.querySelector(".form-container");
        if (!formContainer) return;

        const inputId = `hidden-day-${dayNumber}-${fieldName}`;

        // Remove existing input if exists
        const existingInput = document.getElementById(inputId);
        if (existingInput) {
            existingInput.remove();
        }

        // Create new hidden input
        const hiddenInput = document.createElement("input");
        hiddenInput.type = "hidden";
        hiddenInput.id = inputId;
        hiddenInput.name = `day[${dayNumber}][${fieldName}]`;
        hiddenInput.value =
            typeof value === "object" ? JSON.stringify(value) : value;

        formContainer.appendChild(hiddenInput);
    }

    removeHiddenInput(dayNumber, fieldName) {
        const inputId = `hidden-day-${dayNumber}-${fieldName}`;
        const input = document.getElementById(inputId);
        if (input) {
            input.remove();
        }
    }

    updateSidebarForDay(dayNumber) {
        const dayData = this.dailyPlans[dayNumber];
        // Update sidebar tour item for this day - tìm trong context sidebar cụ thể
        const sidebarTourItem = document.querySelector(
            `#container__customize .sidebar .tour-item[data-day="${dayNumber}"]`
        );

        if (sidebarTourItem) {
            const titleElement = sidebarTourItem.querySelector(".label");
            if (titleElement) {
                if (!dayData) {
                    // No data yet
                    titleElement.textContent = `Day ${dayNumber}: --`;
                } else if (dayData.noService) {
                    // No service selected
                    titleElement.textContent = `Day ${dayNumber}: Free day`;
                } else if (dayData.selectedTourData) {
                    // Tour selected
                    titleElement.textContent = `Day ${dayNumber}: ${dayData.selectedTourData.name}`;
                } else {
                    // Data exists but no tour selected yet
                    titleElement.textContent = `Day ${dayNumber}: --`;
                }
            }

            const detailElement = sidebarTourItem.querySelector(".tour-item-detail");
            if (detailElement) {
                detailElement.textContent = `Detail`;

                // ✅ ADDED: Add click event for popup (remove existing first)
                detailElement.style.cursor = "pointer";

                // Remove existing event listeners
                const newDetailElement = detailElement.cloneNode(true);
                detailElement.parentNode.replaceChild(newDetailElement, detailElement);

                // Add new event listener
                newDetailElement.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showTourDetailPopup(dayNumber, dayData);
                });
            }
        }

        // Update total pricing (only if we have data)
        if (dayData) {
            this.calculateDayTotal(dayNumber);
            this.displayDayTotalPrice(dayNumber);
            this.updateSidebarTotalPrice();

            // ✅ ADDED: Update coupon and gift visibility when day data changes
            this.updateCouponAndGiftVisibility();
        }
    }

    calculateDayTotal(dayNumber) {
        const dayData = this.dailyPlans[dayNumber];
        if (!dayData || dayData.noService) return 0;

        let total = 0;

        try {
            // Add vehicle price
            if (dayData.vehicle?.calculatedPrice) {
                total += dayData.vehicle.calculatedPrice;
            }

            // Add hotel price (room count * base price)
            if (dayData.hotel && dayData.roomCount) {
                const hotelPrice = this.getHotelBasePrice(dayData.hotel);
                total += hotelPrice * dayData.roomCount;
            }

            // Add extra bed price
            if (dayData.extraBedCount) {
                // ✅ UPDATED: Get extra bed price from selected hotel instead of hardcoded $10
                const extraBedPrice = this.getExtraBedPrice(dayNumber, dayData.hotel);
                total += dayData.extraBedCount * extraBedPrice;
            }

            // Add food price if selected
            if (dayData.food) {
                const paxCount = this.getDayPaxCount(dayNumber);
                const foodPrice = this.getFoodBasePrice(dayData.food);
                total += foodPrice * paxCount.totalPax;
            }

            dayData.totalPrice = total;
            this.saveDayData(dayNumber, { totalPrice: total });

            // Update grand total
            this.updateGrandTotal();

            return total;
        } catch (error) {
            console.error(`Error calculating total for day ${dayNumber}:`, error);
            // Show error message to user
            this.showFieldError(dayNumber, "pricing", `Pricing error: ${error.message}`);
            return 0;
        }
    }

    getHotelBasePrice(hotelType) {
        // ✅ UPDATED: Get hotel price from API data - no fallback
        if (!hotelType) {
            console.error("Hotel type is required for price calculation");
            throw new Error("Hotel type is required for price calculation");
        }

        // Get hotel data from HotelManager
        const hotels = this.hotelManager.currentHotels;
        const selectedHotel = hotels.find(h => h.value === hotelType);

        if (!selectedHotel) {
            console.error(`Hotel not found for type: ${hotelType}`);
            throw new Error(`Hotel not found for type: ${hotelType}`);
        }

        if (!selectedHotel.price) {
            console.error(`Hotel price not available for: ${hotelType}`);
            throw new Error(`Hotel price not available for: ${hotelType}`);
        }

        return selectedHotel.price;
    }

    getFoodBasePrice(foodType) {
        // ✅ UPDATED: Use FoodManager for API data instead of static data
        return this.foodManager.getFoodPrice(foodType);
    }

    // ✅ ADDED: Get extra bed price from selected hotel
    getExtraBedPrice(dayNumber, hotelValue) {
        if (!hotelValue) {
            console.error("Hotel value is required for extra bed price calculation");
            throw new Error("Hotel value is required for extra bed price calculation");
        }

        // Get hotel data from HotelManager
        const hotels = this.hotelManager.currentHotels;
        const selectedHotel = hotels.find(h => h.value === hotelValue);

        if (!selectedHotel) {
            console.error(`Hotel not found for extra bed price: ${hotelValue}`);
            throw new Error(`Hotel not found for extra bed price: ${hotelValue}`);
        }

        if (!selectedHotel.price_extrabed) {
            console.error(`Extra bed price not available for hotel: ${hotelValue}`);
            throw new Error(`Extra bed price not available for hotel: ${hotelValue}`);
        }

        return selectedHotel.price_extrabed;
    }

    // ✅ ADDED: Update extra bed price display in UI
    updateExtraBedPriceDisplay(dayNumber, hotel) {
        const extraBedPriceElement = document.querySelector(
            `#day-${dayNumber} .extra-bed-price`
        );

        if (extraBedPriceElement && hotel) {
            try {
                const extraBedPrice = hotel.price_extrabed || this.getExtraBedPrice(dayNumber, hotel.value);
                extraBedPriceElement.textContent = `(${extraBedPrice}usd/bed)`;
            } catch (error) {
                console.error("Error updating extra bed price display:", error);
                extraBedPriceElement.textContent = "(Price not available)";
            }
        }
    }

    // ===== VALIDATION METHODS =====
    // Rule: Extra bed count cannot exceed room count (max 1 extra bed per room)

    validateExtraBedCountAgainstRooms(dayNumber, roomCount) {
        const extraBedCountElement = document.getElementById(
            `extraBedCount-${dayNumber}`
        );
        const dayData = this.dailyPlans[dayNumber];
        if (!extraBedCountElement) return;

        // Nếu chưa chọn hotel thì cảnh báo và return
        if (!dayData || !dayData.hotel) {
            this.showExtraBedValidationMessage(dayNumber, "Please select a hotel before adding extra bed.");
            return;
        }

        const currentExtraBeds = parseInt(extraBedCountElement.textContent) || 0;

        // ✅ SỬA: Chỉ giảm extrabed về roomCount nếu extrabed > roomCount, không tự động tăng
        if (currentExtraBeds > roomCount) {
            // Giảm về roomCount thay vì set bằng roomCount
            const validExtraBeds = Math.min(currentExtraBeds, roomCount);
            extraBedCountElement.textContent = validExtraBeds.toString().padStart(2, "0");
            this.saveDayData(dayNumber, { extraBedCount: validExtraBeds });

            this.showExtraBedValidationMessage(
                dayNumber,
                `The number of extrabeds currently available is greater than the number of rooms you have selected. You cannot submit this form. Please double check the number of rooms you wish to reserve.`
            );
            // Auto-hide message after 3 seconds
            setTimeout(() => {
                this.hideExtraBedValidationMessage(dayNumber);
            }, 3000);
        } else {
            // Không tự động tăng extrabed khi room tăng
            this.hideExtraBedValidationMessage(dayNumber);
        }
    }

    showExtraBedValidationMessage(dayNumber, message) {
        let messageElement = document.getElementById(
            `extraBedValidation-${dayNumber}`
        );

        if (!messageElement) {
            // Create validation message element
            messageElement = document.createElement("div");
            messageElement.id = `extraBedValidation-${dayNumber}`;
            messageElement.className = "extrabed-error-message";
            // Insert after extra bed count controls
            const extraBedInputGroup = document.getElementById(
                `extraBedInputGroup-${dayNumber}`
            );
            if (extraBedInputGroup) {
                extraBedInputGroup.appendChild(messageElement);
            }
        }

        messageElement.innerHTML = `
        <div class="extrabed-error-icon">
            <img src="/wp-content/uploads/2025/07/warning-2.svg">
        </div>
        <span class="extrabed-error-text">${message}</span>
        `;

        // ✅ SỬA: Đảm bảo element hiển thị
        messageElement.style.display = "flex";
        messageElement.style.opacity = "1";

    }

    hideExtraBedValidationMessage(dayNumber) {
        const messageElement = document.getElementById(
            `extraBedValidation-${dayNumber}`
        );
        if (messageElement) {
            messageElement.style.opacity = "0";
            setTimeout(() => {
                messageElement.style.display = "none";
            }, 300);
        }
    }

    // ===== HOTEL MANAGEMENT =====

    async loadHotelsForDay(dayNumber, lang = null) {
        try {
            // ✅ FIXED: Get tour ID from selected tour data instead of hardcoded 467
            const dayData = this.dailyPlans[dayNumber];
            const tourId = dayData?.selectedTour || dayData?.selectedTourData?.id;

            // ✅ ADDED: Get language from window._LANG or use default
            const currentLang = lang || window._LANG || "en";

            if (!tourId) {
                console.warn(`No tour selected for day ${dayNumber}`);
                this.showHotelPlaceholder(dayNumber);
                return;
            }

            const hotels = await this.hotelManager.fetchHotels(tourId, currentLang);

            this.renderHotelOptions(dayNumber, hotels);
            this.initHotelEvents(dayNumber);
        } catch (error) {
            console.error("Error loading hotels for day:", error);
            // Show error message instead of fallback
            this.showHotelError(dayNumber, error.message);
        }
    }

    renderHotelOptions(dayNumber, hotels) {
        const hotelOptionsContainer = document.getElementById(
            `hotelOptions-${dayNumber}`
        );
        if (!hotelOptionsContainer) return;

        const roomCount =
            parseInt(
                document.getElementById(`roomCount-${dayNumber}`)?.textContent
            ) || 1;

        hotelOptionsContainer.innerHTML = "";

        hotels.forEach((hotel, index) => {
            const hotelOption = document.createElement("label");
            hotelOption.className = "hotel-option";
            hotelOption.setAttribute("data-price", hotel.price);

            hotelOption.innerHTML = `
                <input type="radio" class="hotel-radio" value="${hotel.value}" name="hotel-${dayNumber}">
                <div class="hotel-details">
                    <p class="hotel-title">${hotel.name}</p>
                    <p class="hotel-price">${hotel.price} usd <span>/</span> night <span>/</span> room <span class="hotel-pax">(2pax/room)</span> x
                        <span class="hotel-room-count">${roomCount}</span>
                    </p>
                </div>
            `;

            hotelOptionsContainer.appendChild(hotelOption);
        });

        // ✅ UPDATED: Show placeholder initially instead of default hotel gallery
        this.showHotelPlaceholder(dayNumber);
    }

    // ✅ ADDED: Show placeholder for hotel gallery
    showHotelPlaceholder(dayNumber) {
        const hotelGallery = document.getElementById(`hotelGallery-${dayNumber}`);
        const hotelImagesTitle = document.querySelector(
            `#day-${dayNumber} .hotel-images p`
        );

        if (hotelGallery) {
            hotelGallery.innerHTML =
                '<div class="food-placeholder">Please select information for this item</div>';
        }

        if (hotelImagesTitle) {
            hotelImagesTitle.textContent = `Images for:`;
        }
    }

    // ✅ ADDED: Show hotel error message
    showHotelError(dayNumber, errorMessage) {
        const hotelOptionsContainer = document.getElementById(
            `hotelOptions-${dayNumber}`
        );
        const hotelGallery = document.getElementById(`hotelGallery-${dayNumber}`);
        const hotelImagesTitle = document.querySelector(
            `#day-${dayNumber} .hotel-images p`
        );

        if (hotelOptionsContainer) {
            hotelOptionsContainer.innerHTML =
                `<div class="error-message">Failed to load hotels: ${errorMessage}</div>`;
        }

        if (hotelGallery) {
            hotelGallery.innerHTML =
                '<div class="error-message">Unable to load hotel images</div>';
        }

        if (hotelImagesTitle) {
            hotelImagesTitle.textContent = `Images for: Error`;
        }
    }

    // ✅ ADDED: Update hotel gallery with hotel images
    updateHotelGallery(dayNumber, hotel) {
        const hotelGallery = document.getElementById(`hotelGallery-${dayNumber}`);
        if (!hotelGallery) return;

        // Nếu chưa chọn hotel (hotel là undefined/null) thì show placeholder
        if (!hotel) {
            this.showHotelPlaceholder(dayNumber);
            return;
        }

        hotelGallery.innerHTML = "";

        if (hotel.gallery && hotel.gallery.length > 0) {
            hotel.gallery.forEach((imageUrl, index) => {
                const img = document.createElement("img");
                img.src = imageUrl;
                img.alt = `${hotel.name} Room ${index + 1}`;
                hotelGallery.appendChild(img);
            });
        } else {
            // Fallback if no images
            hotelGallery.innerHTML =
                '<div class="food-placeholder">Không có hình ảnh cho khách sạn này</div>';
        }

        // Update images title
        const imagesTitle = document.querySelector(
            `#day-${dayNumber} .hotel-images p`
        );
        if (imagesTitle) {
            imagesTitle.innerHTML = `Images for: <span class="selected-hotel-name">${hotel.name}</span>`;
        }
    }

    initHotelEvents(dayNumber) {
        const hotelRadios = document.querySelectorAll(
            `input[name="hotel-${dayNumber}"]`
        );

        hotelRadios.forEach((radio) => {
            radio.addEventListener("change", () => {
                if (radio.checked) {
                    this.selectHotel(dayNumber, radio.value);
                }
            });
        });

        // Extra bed radio events
        const extraBedRadios = document.querySelectorAll(
            `input[name="extra-bed-${dayNumber}"]`
        );
        extraBedRadios.forEach((radio) => {
            radio.addEventListener("change", () => {
                this.handleExtraBedSelection(dayNumber, radio.value);
            });
        });

        // Extra bed count buttons
        const extraBedMinusBtn = document.querySelector(
            `.extra-bed-btn.minus[data-day="${dayNumber}"]`
        );
        const extraBedPlusBtn = document.querySelector(
            `.extra-bed-btn.plus[data-day="${dayNumber}"]`
        );

        if (extraBedMinusBtn) {
            console.log(`🔧 [initHotelEvents] Adding minus event listener for day ${dayNumber}`);
            // ✅ SỬA: Xóa event listener cũ bằng cách clone node
            extraBedMinusBtn.replaceWith(extraBedMinusBtn.cloneNode(true));
            const newExtraBedMinusBtn = document.querySelector(`.extra-bed-btn.minus[data-day="${dayNumber}"]`);
            newExtraBedMinusBtn.addEventListener("click", () => {
                console.log(`➖ [extraBedMinusBtn] Clicked for day ${dayNumber}`);
                this.updateExtraBedCount(dayNumber, -1);
            });
        }
        if (extraBedPlusBtn) {
            console.log(`🔧 [initHotelEvents] Adding plus event listener for day ${dayNumber}`);
            // ✅ SỬA: Xóa event listener cũ bằng cách clone node
            extraBedPlusBtn.replaceWith(extraBedPlusBtn.cloneNode(true));
            const newExtraBedPlusBtn = document.querySelector(`.extra-bed-btn.plus[data-day="${dayNumber}"]`);
            newExtraBedPlusBtn.addEventListener("click", () => {
                console.log(`➕ [extraBedPlusBtn] Clicked for day ${dayNumber}`);
                this.updateExtraBedCount(dayNumber, 1);
            });
        }
    }

    selectHotel(dayNumber, hotelValue) {
        const hotelRadio = document.querySelector(
            `input[name="hotel-${dayNumber}"][value="${hotelValue}"]`
        );
        const hotelOption = hotelRadio?.closest(".hotel-option");
        const hotelPrice = hotelOption?.dataset.price;

        // Find hotel data
        const hotels = this.hotelManager.currentHotels;
        const selectedHotel = hotels.find((h) => h.value === hotelValue);

        if (selectedHotel) {
            // Update gallery
            this.updateHotelGallery(dayNumber, selectedHotel);

            // ✅ ADDED: Update extra bed price display
            this.updateExtraBedPriceDisplay(dayNumber, selectedHotel);

            // Save hotel data
            this.saveDayData(dayNumber, {
                hotel: hotelValue,
                hotelData: selectedHotel,
                hotelPrice: selectedHotel.price,
            });

            // Debug log
            const dayData = this.dailyPlans[dayNumber];
            const roomCount = document.getElementById(`roomCount-${dayNumber}`)?.textContent;
            const extraBedCount = document.getElementById(`extraBedCount-${dayNumber}`)?.textContent;
            console.log(`[selectHotel] day ${dayNumber} | hotel:`, dayData?.hotel, '| roomCount:', roomCount, '| extraBedCount:', extraBedCount);

            // Nếu đang chọn add extra bed thì cập nhật lại UI
            const extraBedRadio = document.querySelector(`input[name="extra-bed-${dayNumber}"][value="add-extra-bed"]`);
            if (extraBedRadio && extraBedRadio.checked) {
                this.handleExtraBedSelection(dayNumber, "add-extra-bed");
            }

            // Update pricing
            this.calculateDayTotal(dayNumber);
            this.displayDayTotalPrice(dayNumber);
        }
    }

    handleExtraBedSelection(dayNumber, extraBedValue) {
        const extraBedInputGroup = document.getElementById(
            `extraBedInputGroup-${dayNumber}`
        );
        // Lấy lại state mới nhất sau khi saveDayData
        let dayData = this.dailyPlans[dayNumber];
        const roomCount = document.getElementById(`roomCount-${dayNumber}`)?.textContent;
        const extraBedCount = document.getElementById(`extraBedCount-${dayNumber}`)?.textContent;
        console.log(`[handleExtraBedSelection] day ${dayNumber} | hotel:`, dayData?.hotel, '| roomCount:', roomCount, '| extraBedCount:', extraBedCount, '| extraBedValue:', extraBedValue);

        // Chỉ show warning nếu thực sự chưa chọn hotel
        if (!dayData || !dayData.hotel) {
            this.showExtraBedValidationMessage(dayNumber, "Please select a hotel before adding extra bed.");
            return;
        }

        if (extraBedValue === "add-extra-bed") {
            if (extraBedInputGroup) {
                extraBedInputGroup.style.display = "block";
            }

            // ✅ SỬA: Không tự động set về 1, giữ nguyên giá trị hiện tại
            const extraBedCountEl = document.getElementById(
                `extraBedCount-${dayNumber}`
            );
            const roomCountElement = document.getElementById(
                `roomCount-${dayNumber}`
            );

            if (extraBedCountEl) {
                const currentExtraBeds = parseInt(extraBedCountEl.textContent) || 0;
                const roomCountVal = parseInt(roomCountElement?.textContent) || 0;

                // Chỉ validate, không thay đổi giá trị
                if (currentExtraBeds > roomCountVal) {
                    const validExtraBeds = Math.min(currentExtraBeds, roomCountVal);
                    extraBedCountEl.textContent = validExtraBeds.toString().padStart(2, "0");
                    this.saveDayData(dayNumber, {
                        extraBed: extraBedValue,
                        extraBedCount: validExtraBeds,
                    });
                } else {
                    // Giữ nguyên giá trị hiện tại
                    this.saveDayData(dayNumber, {
                        extraBed: extraBedValue,
                        extraBedCount: currentExtraBeds,
                    });
                }

                // Lấy lại state mới nhất
                dayData = this.dailyPlans[dayNumber];

                // Update pricing when adding extra bed
                this.calculateDayTotal(dayNumber);
                this.displayDayTotalPrice(dayNumber);
            }
        } else {
            if (extraBedInputGroup) {
                extraBedInputGroup.style.display = "none";
            }

            // Hide validation message when no extra bed is selected
            this.hideExtraBedValidationMessage(dayNumber);

            this.saveDayData(dayNumber, {
                extraBed: extraBedValue,
                extraBedCount: 0,
            });

            // Update pricing when removing extra bed
            this.calculateDayTotal(dayNumber);
            this.displayDayTotalPrice(dayNumber);
        }
    }

    updateExtraBedCount(dayNumber, change) {
        const extraBedCountElement = document.getElementById(
            `extraBedCount-${dayNumber}`
        );
        const roomCountElement = document.getElementById(`roomCount-${dayNumber}`);
        const dayData = this.dailyPlans[dayNumber];

        // Chỉ show warning nếu thực sự chưa chọn hotel
        if (!dayData || !dayData.hotel) {
            this.showExtraBedValidationMessage(dayNumber, "Please select a hotel before adding extra bed.");
            return;
        }

        if (!extraBedCountElement || !roomCountElement) return;

        const roomCount = parseInt(roomCountElement.textContent) || 1;
        let currentCount = parseInt(extraBedCountElement.textContent) || 0;
        let newCount = currentCount + change;

        // ✅ SỬA: Logic kiểm tra chặt chẽ hơn
        // Nếu giảm dưới 0, set về 0
        if (newCount < 0) {
            newCount = 0;
        }

        // Nếu tăng vượt roomCount, không cho tăng
        if (newCount > roomCount) {
            this.showExtraBedValidationMessage(
                dayNumber,
                `The number of extrabeds currently available is greater than the number of rooms you have selected. You cannot submit this form. Please double check the number of rooms you wish to reserve.`
            );
            // Auto-hide message after 3 seconds
            setTimeout(() => {
                this.hideExtraBedValidationMessage(dayNumber);
            }, 3000);
            return; // Không cập nhật gì cả
        }


        // Ẩn warning nếu giá trị hợp lệ
        this.hideExtraBedValidationMessage(dayNumber);

        // Cập nhật UI và data
        extraBedCountElement.textContent = newCount.toString().padStart(2, "0");
        this.saveDayData(dayNumber, { extraBedCount: newCount });

        // Update pricing
        this.calculateDayTotal(dayNumber);
        this.displayDayTotalPrice(dayNumber);
    }

    // ===== FOOD & DRINK MANAGEMENT =====

    initFoodEvents(dayNumber) {
        const foodRadios = document.querySelectorAll(
            `input[name="food-${dayNumber}"]`
        );

        foodRadios.forEach((radio) => {
            radio.addEventListener("change", () => {
                if (radio.checked) {
                    this.selectFood(dayNumber, radio.value);
                }
            });
        });
    }

    selectFood(dayNumber, foodValue) {
        // ✅ UPDATED: Find selected food data from API
        const selectedFood = this.foodManager.foodOptions.find(
            (f) => f.value === foodValue
        );

        if (selectedFood) {
            this.updateFoodGalleryFromAPI(dayNumber, selectedFood);
        }

        // Food is optional, so we just save the selection
        this.saveDayData(dayNumber, {
            food: foodValue,
            foodData: selectedFood,
        });

        // Update pricing
        this.calculateDayTotal(dayNumber);
        this.displayDayTotalPrice(dayNumber);
    }

    // ===== OTHER SERVICES MANAGEMENT =====

    initServicesEvents(dayNumber) {
        const serviceCheckboxes = document.querySelectorAll(
            `#day-${dayNumber} .services-section input[type="checkbox"]`
        );

        serviceCheckboxes.forEach((checkbox) => {
            checkbox.addEventListener("change", () => {
                this.handleOtherServicesSelection(dayNumber);
            });
        });
    }

    handleOtherServicesSelection(dayNumber) {
        const serviceCheckboxes = document.querySelectorAll(
            `#day-${dayNumber} .services-section input[type="checkbox"]:checked`
        );
        const selectedServices = Array.from(serviceCheckboxes).map(
            (cb) => cb.value
        );

        this.saveDayData(dayNumber, {
            services: selectedServices,
        });
    }

    // ✅ ADDED: Handle search from dropdown search boxes
    initDropdownSearchEvents(dayNumber) {
        // City dropdown search
        const cityDropdown = document.getElementById(`cityDropdown-${dayNumber}`);
        if (cityDropdown) {
            cityDropdown.addEventListener("input", (e) => {
                if (e.target.classList.contains("city-search-input")) {
                    this.searchCities(dayNumber, e.target.value);
                }
            });
        }

        // Tour type dropdown search
        const tourTypeDropdown = document.getElementById(
            `tourTypeDropdown-${dayNumber}`
        );
        if (tourTypeDropdown) {
            tourTypeDropdown.addEventListener("input", (e) => {
                if (e.target.classList.contains("tourtype-search-input")) {
                    this.searchTourTypes(dayNumber, e.target.value);
                }
            });
        }

        // ✅ ADDED: Guide dropdown search
        const guideDropdown = document.getElementById(`guideDropdown-${dayNumber}`);
        if (guideDropdown) {
            guideDropdown.addEventListener("input", (e) => {
                if (e.target.classList.contains("guide-search-input")) {
                    this.searchGuides(dayNumber, e.target.value);
                }
            });
        }
    }

    // ===== ENHANCED INIT DAY EVENTS =====

    initAllDayEvents(dayNumber, dayElement = null) {
        // Call original initDayEvents
        this.initDayEvents(dayNumber, dayElement);

        // Add new event listeners
        setTimeout(() => {
            this.initFoodEvents(dayNumber);
            this.initServicesEvents(dayNumber);
        }, 500);
    }

    // Override to ensure we also load hotels and init all events
    async loadStaticDay1Hotels() {
        // Load hotels for static day 1 if it exists
        const day1Element = document.getElementById("day-1");
        if (day1Element) {
            await this.loadHotelsForDay(1);
            this.initAllDayEvents(1);
        }
    }

    // ===== PRICING DISPLAY METHODS =====

    displayDayTotalPrice(dayNumber) {
        const totalPriceDayElement = document.getElementById(
            `totalPriceDay-${dayNumber}`
        );
        if (!totalPriceDayElement) return;

        const dayData = this.dailyPlans[dayNumber];
        const totalPrice = dayData?.totalPrice || 0;

        if (totalPrice > 0) {
            totalPriceDayElement.innerHTML = `
                <div class="day-total-price">
                    <span class="total-amount">$${totalPrice.toFixed(2)}</span>
                </div>
            `;
            totalPriceDayElement.style.display = "block";
        } else {
            totalPriceDayElement.innerHTML = "";
            totalPriceDayElement.style.display = "none";
        }
    }

    updateGrandTotal() {
        this.grandTotal = 0;

        Object.values(this.dailyPlans).forEach((dayData) => {
            if (dayData.totalPrice && !dayData.noService) {
                this.grandTotal += dayData.totalPrice;
            }
        });

        // ✅ ADDED: Check gift eligibility using GiftSelectionManager
        if (window.giftSelectionManager) {
            window.giftSelectionManager.checkGiftEligibility(this.grandTotal);
        }

        // ✅ ADDED: Update coupon availability when total price changes
        this.updateCouponAvailability();

        // ✅ ADDED: Update sidebar with coupon discount
        this.updateSidebarWithCoupon();

        // ✅ ADDED: Reload coupons when total price changes (only if popup is open and no coupon is selected)
        const lotuscoupon = document.querySelector(".lotuscoupon");
        if (lotuscoupon && lotuscoupon.classList.contains("open") && !this.selectedCoupon) {
            this.loadValidCoupons();
        }

        // ✅ ADDED: Update coupon and gift visibility when grand total changes
        this.updateCouponAndGiftVisibility();
    }

    // ===== DATA PERSISTENCE METHODS =====

    saveCurrentStepData() {
        const formData = {
            dailyPlans: this.dailyPlans,
            grandTotal: this.grandTotal,
            currentPaxMode: this.currentPaxMode,
            lastGeneratedMode: this.lastGeneratedMode,
        };

        // Save to bookingForm for multi-step persistence
        if (this.bookingForm) {
            this.bookingForm.formData = this.bookingForm.formData || {};
            this.bookingForm.formData.dailyPlan = formData;
        }

        // Also save to localStorage as backup
        localStorage.setItem("dailyPlanFormData", JSON.stringify(formData));
    }

    restoreDayUI(dayNumber) {
        const dayData = this.dailyPlans[dayNumber];
        if (!dayData) return;

        setTimeout(() => {
            // Restore location selection
            if (dayData.location) {
                const locationRadio = document.querySelector(
                    `input[name="location-${dayNumber}"][value="${dayData.location}"]`
                );
                if (locationRadio) {
                    locationRadio.checked = true;

                    // ✅ ADDED: Handle city section visibility for Phu Quoc
                    if (dayData.location === 'phu-quoc') {
                        const citySection = document.querySelector(`#day-${dayNumber} .city-section`);
                        if (citySection) {
                            citySection.style.display = 'none';
                        }
                    }
                }
            }

            // Restore city
            if (dayData.cityLabel) {
                const citySearch = document.getElementById(`city-${dayNumber}`);
                if (citySearch) {
                    citySearch.value = dayData.cityLabel;
                    citySearch.dataset.value = dayData.city;
                }
            }

            // Restore tour type
            if (dayData.tourTypeLabel) {
                const tourTypeSearch = document.getElementById(`tourType-${dayNumber}`);
                if (tourTypeSearch) {
                    tourTypeSearch.value = dayData.tourTypeLabel;
                    tourTypeSearch.dataset.value = dayData.tourType;
                }
            }

            // Restore selected tour if available
            if (dayData.selectedTourData) {
                this.renderTourCards(dayNumber, [dayData.selectedTourData]);
            }

            // Restore vehicle selection
            if (dayData.itinerary) {
                const itineraryRadio = document.querySelector(
                    `input[name="itinerary-${dayNumber}"][value="${dayData.itinerary}"]`
                );
                if (itineraryRadio) {
                    itineraryRadio.checked = true;
                }
            }

            // Restore guide
            if (dayData.guide) {
                const guideSearch = document.getElementById(`guide-${dayNumber}`);
                if (guideSearch) {
                    guideSearch.value = dayData.guide;
                }
            }

            // Restore food selection
            if (dayData.food) {
                const foodRadio = document.querySelector(
                    `input[name="food-${dayNumber}"][value="${dayData.food}"]`
                );
                if (foodRadio) {
                    foodRadio.checked = true;
                }
            }

            // Restore hotel selection
            if (dayData.hotel) {
                const hotelRadio = document.querySelector(
                    `input[name="hotel-${dayNumber}"][value="${dayData.hotel}"]`
                );
                if (hotelRadio) {
                    hotelRadio.checked = true;

                    // ✅ ADDED: Restore extra bed price display when hotel is restored
                    const hotels = this.hotelManager.currentHotels;
                    const selectedHotel = hotels.find(h => h.value === dayData.hotel);
                    if (selectedHotel) {
                        this.updateExtraBedPriceDisplay(dayNumber, selectedHotel);
                    }
                }
            }

            // Restore room count
            if (dayData.roomCount) {
                const roomCountElement = document.getElementById(
                    `roomCount-${dayNumber}`
                );
                if (roomCountElement) {
                    roomCountElement.textContent = dayData.roomCount
                        .toString()
                        .padStart(2, "0");
                }
            }

            // Restore extra bed
            if (dayData.extraBed) {
                const extraBedRadio = document.querySelector(
                    `input[name="extra-bed-${dayNumber}"][value="${dayData.extraBed}"]`
                );
                if (extraBedRadio) {
                    extraBedRadio.checked = true;
                    if (dayData.extraBed === "add-extra-bed") {
                        const extraBedInputGroup = document.getElementById(
                            `extraBedInputGroup-${dayNumber}`
                        );
                        if (extraBedInputGroup) {
                            extraBedInputGroup.style.display = "block";
                        }
                    }
                }
            }

            // Restore extra bed count
            if (dayData.extraBedCount) {
                const extraBedCountElement = document.getElementById(
                    `extraBedCount-${dayNumber}`
                );
                if (extraBedCountElement) {
                    extraBedCountElement.textContent = dayData.extraBedCount
                        .toString()
                        .padStart(2, "0");
                }
            }

            // Restore services
            if (dayData.services && Array.isArray(dayData.services)) {
                dayData.services.forEach((serviceValue) => {
                    const serviceCheckbox = document.querySelector(
                        `#day-${dayNumber} .services-section input[value="${serviceValue}"]`
                    );
                    if (serviceCheckbox) {
                        serviceCheckbox.checked = true;
                    }
                });
            }

            // Show progressive sections if data exists
            if (dayData.city) {
                this.showProgressiveSection(dayNumber, ".tour-section");
            }
            if (dayData.selectedTour) {
                this.showProgressiveSection(dayNumber, ".itinerary-section");
                this.showProgressiveSection(dayNumber, ".vehicle-section");
                this.showProgressiveSection(dayNumber, ".guide-section");
                this.showProgressiveSection(dayNumber, ".food-section");
                this.showProgressiveSection(dayNumber, ".hotel-section");
                this.showProgressiveSection(dayNumber, ".services-section");
            }

            // Update total price display
            this.displayDayTotalPrice(dayNumber);

            // Update sidebar with tour information
            this.updateSidebarForDay(dayNumber);

            // Collapse if confirmed
            if (dayData.confirmed) {
                this.collapseDay(dayNumber);
            }
        }, 500);
    }

    // Call this when leaving step 2
    beforeStepChange() {
        this.saveCurrentStepData();
        // ✅ ADDED: Ensure coupon discount is applied before changing steps
        this.ensureCouponDiscountApplied();
        // ✅ ADDED: Update coupon and gift visibility when changing steps
        this.updateCouponAndGiftVisibility();
    }

    // ✅ ADDED: Search guides method (similar to searchCities and searchTourTypes)
    searchGuides(dayNumber, query) {
        const guideDropdown = document.getElementById(`guideDropdown-${dayNumber}`);
        if (!guideDropdown) return;

        const options = guideDropdown.querySelectorAll(".dropdown-option");
        let visibleCount = 0;

        options.forEach((option) => {
            const text = option.textContent.toLowerCase();
            const matches = text.includes(query.toLowerCase());

            // Show/hide option based on search
            option.style.display = matches ? "block" : "none";
            if (matches) visibleCount++;
        });

        // Show/hide no results message
        let noResultsMessage = guideDropdown.querySelector(".no-results-message");
        if (!noResultsMessage) {
            noResultsMessage = document.createElement("div");
            noResultsMessage.className = "no-results-message";
            noResultsMessage.textContent = "No guides found";
            noResultsMessage.style.cssText = `
                padding: 1rem;
                text-align: center;
                color: #94a3b8;
                font-size: 0.875rem;
                display: none;
                background: #f8fafc;
                border-top: 1px solid #e2e8f0;
            `;
            guideDropdown.appendChild(noResultsMessage);
        }

        noResultsMessage.style.display = visibleCount === 0 ? "block" : "none";
    }

    // ✅ ADDED: Load food options from API
    async loadFoodOptionsForDay(dayNumber, lang = null) {
        try {
            // ✅ ADDED: Get language from window._LANG or use default
            const currentLang = lang || window._LANG || "en";

            const foodOptions = await this.foodManager.fetchFoodOptions(currentLang);
            this.foodManager.foodOptions = foodOptions; // Store for later use

            this.renderFoodOptions(dayNumber, foodOptions);
            this.initFoodEvents(dayNumber);
        } catch (error) {
            console.error("Error loading food options for day:", error);
        }
    }

    // ✅ ADDED: Render food options
    renderFoodOptions(dayNumber, foodOptions) {
        const foodOptionsContainer = document.getElementById(
            `foodOptions-${dayNumber}`
        );
        if (!foodOptionsContainer) return;

        foodOptionsContainer.innerHTML = "";

        foodOptions.forEach((food, index) => {
            const foodOption = document.createElement("label");
            foodOption.className = "food-option";
            foodOption.setAttribute("data-price", food.price);

            foodOption.innerHTML = `
                <input type="radio" class="food-radio" value="${food.value
                }" name="food-${dayNumber}">
                <div class="food-details">
                    <h4 class="food-title">${food.title}</h4>
                    <p class="food-description">${food.description}</p>
                    <p class="food-price">$${food.price}/pax</p>
                </div>
                ${food.images.length > 0
                    ? `
                    <div class="food-image">
                        <img src="${food.images[0]}" alt="${food.title}" loading="lazy">
                    </div>
                `
                    : ""
                }
            `;

            foodOptionsContainer.appendChild(foodOption);
        });
    }

    initFoodEvents(dayNumber) {
        const foodRadios = document.querySelectorAll(
            `input[name="food-${dayNumber}"]`
        );

        foodRadios.forEach((radio) => {
            radio.addEventListener("change", () => {
                if (radio.checked) {
                    this.selectFood(dayNumber, radio.value);
                }
            });
        });
    }

    // ✅ ADDED: Populate food data from API into existing UI
    async populateFoodDataFromAPI(dayNumber, lang = null) {
        try {
            // ✅ ADDED: Get language from window._LANG or use default
            const currentLang = lang || window._LANG || "en";

            const foodOptions = await this.foodManager.fetchFoodOptions(currentLang);
            this.foodManager.foodOptions = foodOptions; // Store for later use

            // Get existing food options in the UI
            const existingFoodOptions = document.querySelectorAll(
                `#day-${dayNumber} .food-option`
            );

            if (existingFoodOptions.length > 0 && foodOptions.length > 0) {
                // Map API data to existing UI elements
                existingFoodOptions.forEach((existingOption, index) => {
                    const apiFood = foodOptions[index];
                    if (apiFood) {
                        // Update title
                        const titleElement = existingOption.querySelector(".food-title");
                        if (titleElement) {
                            titleElement.textContent = apiFood.title;
                        }

                        // Update price
                        const priceElement = existingOption.querySelector(".food-price");
                        if (priceElement) {
                            const paxCount = this.getDayPaxCount(dayNumber).totalPax;
                            priceElement.innerHTML = `$${apiFood.price}/<span>pax</span> x${paxCount}`;
                        }

                        // Update data attributes
                        existingOption.setAttribute("data-price", apiFood.price);
                        const radioInput = existingOption.querySelector(".food-radio");
                        if (radioInput) {
                            radioInput.value = apiFood.value;
                            // ✅ REMOVED: No default selection
                            radioInput.checked = false;
                        }
                    }
                });

                // ✅ ADDED: Show placeholder text initially
                this.showFoodPlaceholder(dayNumber);
            }
        } catch (error) {
            console.error("Error populating food data:", error);
        }
    }

    // Show placeholder text for food gallery
    showFoodPlaceholder(dayNumber) {
        const foodGallery = document.querySelector(
            `#day-${dayNumber} .food-gallery`
        );
        const foodImagesTitle = document.querySelector(
            `#day-${dayNumber} .food-images h4`
        );

        if (foodGallery) {
            foodGallery.innerHTML =
                '<div class="food-placeholder">Please select information for this item</div>';
        }

        if (foodImagesTitle) {
            foodImagesTitle.textContent = "Images for selected food";
        }
    }

    // Update food gallery with API data
    updateFoodGalleryFromAPI(dayNumber, food) {
        const foodGallery = document.querySelector(
            `#day-${dayNumber} .food-gallery`
        );
        const foodImagesTitle = document.querySelector(
            `#day-${dayNumber} .food-images h4`
        );

        if (foodGallery) {
            foodGallery.innerHTML = "";

            if (food.images && food.images.length > 0) {
                //  Show all images from API
                food.images.forEach((imageUrl, index) => {
                    const img = document.createElement("img");
                    img.src = imageUrl;
                    img.alt = `${food.title} ${index + 1}`;
                    foodGallery.appendChild(img);
                });
            } else {
                // Fallback if no images
                foodGallery.innerHTML =
                    '<div class="food-placeholder">No images for this item</div>';
            }
        }

        if (foodImagesTitle) {
            foodImagesTitle.textContent = `Images for ${food.title}`;
        }
    }

    // ✅ ADDED: Hide field error message
    hideFieldError(dayNumber, fieldName) {
        const errorElement = document.querySelector(
            `#day-${dayNumber} [data-field="${fieldName}"]`
        );
        if (errorElement) {
            errorElement.textContent = "";
            errorElement.classList.remove("show");
        }
    }

    // ✅ ADDED: Clear all errors for a day
    clearDayErrors(dayNumber) {
        const dayElement = document.getElementById(`day-${dayNumber}`);
        if (!dayElement) return;

        // Clear field errors
        const errorElements = dayElement.querySelectorAll(".error-message");
        errorElements.forEach((element) => {
            element.textContent = "";
            element.classList.remove("show");
        });

        // Clear section errors
        const sectionErrors = dayElement.querySelectorAll(".section-error");
        sectionErrors.forEach((error) => error.remove());
    }

    // ✅ ADDED: Show tour detail popup
    showTourDetailPopup(dayNumber, dayData) {
        // ✅ ADDED: Set viewing detail state to hide gift/coupon sections
        this.isViewingDetailDay = true;
        this.updateCouponAndGiftVisibility();

        // Remove existing popup if any
        const existingPopup = document.querySelector(".tour-detail-popup");
        if (existingPopup) {
            existingPopup.remove();
        }

        // Check if day has no service
        if (dayData?.noService) {
            this.showNoServicePopup(dayNumber);
            return;
        }

        // Check if day has no data
        if (!dayData || Object.keys(dayData).length === 0) {
            this.showNoDataPopup(dayNumber);
            return;
        }

        // Create popup HTML
        const popupHTML = this.createTourDetailPopupHTML(dayNumber, dayData);

        // Add popup to body
        document.body.insertAdjacentHTML("beforeend", popupHTML);

        // Get popup element
        const popup = document.querySelector(".tour-detail-popup");
        const overlay = document.querySelector(".tour-detail-popup-overlay");

        // Show popup with animation
        setTimeout(() => {
            popup.classList.add("active");
            overlay.classList.add("active");
            document.body.style.overflow = "hidden";
        }, 10);

        // Add close event listeners
        this.initTourDetailPopupEvents(popup, overlay);
    }

    // ✅ ADDED: Helper method to calculate date for specific day
    calculateDayDate(dayNumber) {
        const startDate = document.querySelector("#sidebarStartDate").textContent;
        if (!startDate) return "";

        const date = new Date(startDate);
        date.setDate(date.getDate() + (dayNumber - 1));
        return date.toISOString().split("T")[0];
    }

    // ✅ ADDED: Create tour detail popup HTML
    createTourDetailPopupHTML(dayNumber, dayData) {
        const tourName = dayData?.selectedTourData?.name || "Not specified";
        const vehicle = dayData?.vehicle?.title;
        const guide = dayData?.guide || "Not specified";
        const food = dayData?.foodData?.title || "Not specified";
        const hotel = dayData?.hotelData?.name || "Not specified";
        const services = dayData?.services || [];
        const totalPrice = dayData?.totalPrice || 0;
        const adults = document.querySelector(
            ".tour-members-day p:nth-child(1) strong"
        ).textContent;
        const children = document.querySelector(
            ".tour-members-day p:nth-child(2) strong"
        ).textContent;
        const dayDate = this.calculateDayDate(dayNumber);

        return `
      <div class="tour-detail-popup-overlay"></div>
      <div class="tour-detail-popup">
        <div class="tour-detail-popup-header">
            <div>
            <h3 class="tour-detail-popup-title">Tour booking detail</h3>
            <p class="tour-detail-popup-subtitle">Day ${dayNumber} (${dayDate})</p>
            </div>
          <button class="tour-detail-popup-close">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 5L18.9991 18.9991" stroke="#292D32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M5.00094 18.9991L19 5" stroke="#292D32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="tour-detail-popup-content">
          <div class="tour-detail-section">
            <div class="tour-detail-item">
              <p class="tour-detail-item-title">Pax:</p>
              <div class="tour-detail-item-pax">
                <p>Adults <strong>${adults}</strong></p>
                <p>Children <strong>${children}</strong></p>
              </div>
            </div>
            <div class="tour-detail-item">
              <p class="tour-detail-item-title">Tour:</p>
              <p class="tour-detail-item-value">${tourName}</p>
            </div>
            ${vehicle
                ? `
            <div class="tour-detail-item">
              <p class="tour-detail-item-title">Vehicle:</p>
                <p class="tour-detail-item-value">${vehicle}</p>
              </div>
            `
                : ""
            }
            ${guide
                ? `
            <div class="tour-detail-item">
              <p class="tour-detail-item-title">Tour guide:</p>
              <p class="tour-detail-item-value">${guide}</p>
            </div>
            `
                : ""
            }
            ${food
                ? `
            <div class="tour-detail-item">
              <p class="tour-detail-item-title">Food:</p>
              <p class="tour-detail-item-value">${food}</p>
            </div>
            `
                : ""
            }
            ${hotel
                ? `
            <div class="tour-detail-item">
              <p class="tour-detail-item-title">Hotel:</p>
              <p class="tour-detail-item-value">${hotel}</p>
            </div>
            `
                : ""
            }
            ${services.length > 0
                ? `
            <div class="tour-detail-item">
              <p class="tour-detail-item-title">Other service:</p>
              <p class="tour-detail-item-value">${services.join(", ")}</p>
            </div>
            `
                : ""
            }
          </div>

          <div class="tour-detail-pricing">
            <div class="tour-detail-item total-price">
              <span class="label">Total</span>
              <span class="value">${totalPrice}$</span>
            </div>
          </div>
        </div>
      </div>
    `;
    }

    // ✅ ADDED: Initialize tour detail popup events
    initTourDetailPopupEvents(popup, overlay) {
        const closeBtn = popup.querySelector(".tour-detail-popup-close");

        // Close button click
        if (closeBtn) {
            closeBtn.addEventListener("click", () => {
                this.closeTourDetailPopup(popup, overlay);
            });
        }

        // Overlay click
        if (overlay) {
            overlay.addEventListener("click", () => {
                this.closeTourDetailPopup(popup, overlay);
            });
        }

        // ESC key press
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                this.closeTourDetailPopup(popup, overlay);
            }
        });
    }

    // ✅ ADDED: Close tour detail popup
    closeTourDetailPopup(popup, overlay) {
        popup.classList.remove("active");
        overlay.classList.remove("active");

        setTimeout(() => {
            popup.remove();
            overlay.remove();
            document.body.style.overflow = "auto";

            // ✅ ADDED: Reset viewing detail state to show gift/coupon sections
            this.isViewingDetailDay = false;
            this.updateCouponAndGiftVisibility();
        }, 300);
    }

    // ✅ ADDED: Show no service popup
    showNoServicePopup(dayNumber) {
        const dayDate = this.calculateDayDate(dayNumber);
        const popupHTML = `
      <div class="tour-detail-popup-overlay"></div>
      <div class="tour-detail-popup">
        <div class="tour-detail-popup-header">
          <h3>Day ${dayNumber} Details (${dayDate})</h3>
          <button class="tour-detail-popup-close">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="tour-detail-popup-content">
          <div class="tour-detail-section">
            <div class="no-service-message">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <h4>Free Day</h4>
              <p>This day has been marked as a free day with no scheduled services.</p>
            </div>
          </div>
        </div>
      </div>
    `;

        document.body.insertAdjacentHTML("beforeend", popupHTML);

        const popup = document.querySelector(".tour-detail-popup");
        const overlay = document.querySelector(".tour-detail-popup-overlay");

        setTimeout(() => {
            popup.classList.add("active");
            overlay.classList.add("active");
            document.body.style.overflow = "hidden";
        }, 10);

        this.initTourDetailPopupEvents(popup, overlay);
    }

    // ✅ ADDED: Show no data popup
    showNoDataPopup(dayNumber) {
        const dayDate = this.calculateDayDate(dayNumber);
        const popupHTML = `
      <div class="tour-detail-popup-overlay"></div>
      <div class="tour-detail-popup">
        <div class="tour-detail-popup-header">
          <h3>Day ${dayNumber} Details (${dayDate})</h3>
          <button class="tour-detail-popup-close">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="tour-detail-popup-content">
          <div class="tour-detail-section">
            <div class="no-data-message">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 12h8"/>
              </svg>
              <h4>No Data Available</h4>
              <p>Please complete the tour selection for this day to view details.</p>
            </div>
          </div>
        </div>
      </div>
    `;

        document.body.insertAdjacentHTML("beforeend", popupHTML);

        const popup = document.querySelector(".tour-detail-popup");
        const overlay = document.querySelector(".tour-detail-popup-overlay");

        setTimeout(() => {
            popup.classList.add("active");
            overlay.classList.add("active");
            document.body.style.overflow = "hidden";
        }, 10);

        this.initTourDetailPopupEvents(popup, overlay);
    }

    initSearchCode() {
        setTimeout(() => {
            const coupon_popup = document.getElementById("coupon_popup");
            const lotuscoupon = document.querySelector(".lotuscoupon");
            const overlaypc = document.querySelector(
                ".bookthistour__popup-overlaypc"
            );
            const close = lotuscoupon.querySelector(".lotuscoupon__heading svg");
            const lotuscoupon_footer_btn = lotuscoupon.querySelector(
                ".lotuscoupon_footer_btn"
            );
            const itemdiscount = document.querySelectorAll(
                ".swiper_list_coupon .swiper-slide"
            );
            const enter_search__btn = document.querySelector(".enter_search__btn");
            const enter_search__input = document.querySelector(
                ".enter_search__input"
            );

            // ✅ ADDED: Debug code to check event listener
            if (coupon_popup) {
                coupon_popup.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    lotuscoupon.classList.add("open");
                    overlaypc.style.display = "block";
                    document.querySelector("body").style.overflow = "hidden";
                    this.indexDiscoutMemo = this.indexDiscout;
                });
            }

            overlaypc.addEventListener("click", () => {
                lotuscoupon.classList.remove("open");
                overlaypc.style.display = "none";
                if (window.innerWidth > 639) {
                    document.querySelector("body").style.overflow = "auto";
                }
                this.indexDiscoutMemo = this.indexDiscout;
                itemdiscount.forEach((el) => el.classList.remove("active"));
                const lotuscoupon_footer = document.querySelector(
                    ".lotuscoupon_footer .lotuscoupon_footer_title strong"
                );
                if (itemdiscount[this.indexDiscoutMemo]) {
                    itemdiscount[this.indexDiscoutMemo].classList.add("active");
                    const discountPercent = parseFloat(itemdiscount[this.indexDiscoutMemo].querySelector('.swiper_list_coupon_discount').textContent.replace('-', '').replace('%', ''));
                    const priceDiscount = (this.calculateCurrentTotalPrice() * discountPercent) / 100;
                    lotuscoupon_footer.innerText = `-${new Intl.NumberFormat(
                        "vi-VN"
                    ).format(priceDiscount)}$ discount`;
                } else {
                    if (this.discoutValue !== null) {
                        const priceDiscount = (this.price * this.discoutValue) / 100;
                        lotuscoupon_footer.innerText = `-${new Intl.NumberFormat(
                            "vi-VN"
                        ).format(priceDiscount)}$ discount`;
                    } else {
                        lotuscoupon_footer.innerText = `-0$ discount`;
                    }
                }
            });
            close.addEventListener("click", () => {
                lotuscoupon.classList.remove("open");
                overlaypc.style.display = "none";
                document.querySelector("body").style.overflow = "auto";
                this.indexDiscoutMemo = this.indexDiscout;
                itemdiscount.forEach((el) => el.classList.remove("active"));
                const lotuscoupon_footer = document.querySelector(
                    ".lotuscoupon_footer .lotuscoupon_footer_title strong"
                );
                if (itemdiscount[this.indexDiscoutMemo]) {
                    itemdiscount[this.indexDiscoutMemo].classList.add("active");
                    const discountPercent = parseFloat(itemdiscount[this.indexDiscoutMemo].querySelector('.swiper_list_coupon_discount').textContent.replace('-', '').replace('%', ''));
                    const priceDiscount = (this.calculateCurrentTotalPrice() * discountPercent) / 100;
                    lotuscoupon_footer.innerText = `-${new Intl.NumberFormat(
                        "vi-VN"
                    ).format(priceDiscount)}$ discount`;
                } else {
                    if (this.discoutValue !== null) {
                        const priceDiscount = (this.price * this.discoutValue) / 100;
                        lotuscoupon_footer.innerText = `-${new Intl.NumberFormat(
                            "vi-VN"
                        ).format(priceDiscount)}$ discount`;
                    } else {
                        lotuscoupon_footer.innerText = `-0$ discount`;
                    }
                }
            });
            lotuscoupon_footer_btn.addEventListener("click", () => {
                // Nếu đã chọn coupon từ danh sách
                if (this.selectedCoupon && this.selectedCoupon.discount) {
                    this.discoutValue = parseFloat(this.selectedCoupon.discount);
                    this.couponCode = this.selectedCoupon.code || null;
                    this.updateToPrice();
                }
                lotuscoupon.classList.remove("open");
                overlaypc.style.display = "none";
                document.querySelector("body").style.overflow = "auto";
            });

            enter_search__btn.addEventListener("click", async () => {
                const couponCode = enter_search__input.value.trim();
                if (!couponCode) {
                    this.showCouponMessage("Please enter a coupon code", "error");
                    return;
                }
                // Disable dropdown coupons khi nhập code
                this.disableCouponDropdown();
                try {
                    const coupon = await this.validateCouponCode(couponCode);
                    if (coupon) {
                        this.applyCouponCode(coupon);
                        lotuscoupon.classList.remove("open");
                        overlaypc.style.display = "none";
                        document.querySelector("body").style.overflow = "auto";
                    }
                } catch (error) {
                    this.showCouponMessage(error.message, "error");
                }
            });
        }, 500);
    }

    initDiscount() {
        // Initialize coupon code input first
        this.initCouponCodeInput();

        // Load valid coupons when popup opens
        this.setupCouponPopupDelegation();
    }

    // ✅ ADD: Event delegation for coupon popup
    setupCouponPopupDelegation() {
        document.addEventListener("click", (e) => {
            // Kiểm tra chính xác nút coupon
            const couponBtn = e.target.closest("#coupon_popup");
            if (couponBtn) {
                e.preventDefault();
                e.stopPropagation();
                const lotuscoupon = document.querySelector(".lotuscoupon");
                const overlaypc = document.querySelector(
                    ".bookthistour__popup-overlaypc"
                );
                if (lotuscoupon && overlaypc) {
                    lotuscoupon.classList.add("open");
                    overlaypc.style.display = "block";
                    document.querySelector("body").style.overflow = "hidden";
                    this.indexDiscoutMemo = this.indexDiscout;

                    // ✅ ADDED: Load valid coupons from API
                    this.loadValidCoupons();
                }
            }
        });
    }

    // ✅ ADDED: Load valid coupons from API
    async loadValidCoupons() {
        // ✅ ADDED: Prevent duplicate API calls
        if (this.isLoadingCoupons) {
            return;
        }

        this.isLoadingCoupons = true;

        try {
            const lang = window._LANG || 'en';
            const currentTotalPrice = this.calculateCurrentTotalPrice();
            const currentTotalPax = this.calculateCurrentTotalPax();
            // Gọi API lấy tất cả coupon
            const response = await fetch(`/wp-json/api/v1/coupons?total_pax=${currentTotalPax}&total_amount=${currentTotalPrice}&lang=${lang}`);
            if (!response.ok) {
                throw new Error('Failed to load coupons');
            }
            const coupons = await response.json();
            // Lọc coupon còn hạn sử dụng
            // Sau khi fetch xong, render ra giao diện
            this.renderValidCoupons(coupons);
        } catch (error) {
            console.error('Error loading coupons:', error);
            this.renderValidCoupons([]);
        } finally {
            this.isLoadingCoupons = false;
        }
    }

    // ✅ ADDED: Fallback method for testing
    loadValidCouponsFallback() {
        const testCoupons = [
            {
                id: 1,
                code: 'TEST10',
                discount: 10,
                minimum_total_price: 500,
                minimum_number: 2,
                expires: '2024-12-31',
                title: 'Test Coupon 10%'
            }
        ];
        this.renderValidCoupons(testCoupons);
    }

    // ✅ ADDED: Render valid coupons in the popup
    renderValidCoupons(coupons) {
        const couponContainer = document.querySelector(".lotuscoupon");
        const swiperContainer = document.querySelector(".swiper_list_coupon .swiper-wrapper");
        if (!couponContainer || !swiperContainer) return;

        // Clear existing coupons
        swiperContainer.innerHTML = '';

        if (coupons.length === 0) {
            // Show "Not found coupon" message when no coupons
            swiperContainer.innerHTML = `
                <div class="swiper-slide no-coupon-message" style="text-align: center; padding: 20px; color: #666;">
                    <p>Not found coupon</p>
                </div>
            `;
            // Keep container visible to show the message
            couponContainer.style.display = 'block';
            return;
        }

        // Show coupon container
        couponContainer.style.display = 'block';

        // Render each coupon
        coupons.forEach((coupon, index) => {
            const couponElement = this.createCouponElement(coupon, index);

            // ✅ ADDED: Set active state for selected coupon
            if (this.selectedCoupon && coupon.id === this.selectedCoupon.id) {
                couponElement.classList.add('active');
            }

            swiperContainer.appendChild(couponElement);
        });

        // Initialize coupon click events
        this.initCouponClickEvents();
    }

    // ✅ ADDED: Create coupon element
    createCouponElement(coupon, index) {
        const couponElement = document.createElement('div');
        couponElement.className = 'swiper-slide';
        couponElement.dataset.couponId = coupon.id;
        couponElement.dataset.couponIndex = index;
        couponElement.dataset.minimumTotalPrice = coupon.minimum_total_price || '';
        couponElement.dataset.minimumNumber = coupon.minimum_number || '';

        const expiresText = coupon.expires ? new Date(coupon.expires).toLocaleDateString() : 'No expiry';

        couponElement.innerHTML = `
            <img src="${coupon.background_image || '/wp-content/uploads/2025/07/Subtract.png'}" class="swiper_list_coupon_bg" alt="Coupon Background">
            <img src="${coupon.inactive_image || '/wp-content/uploads/2025/07/Subtract-1.png'}" class="swiper_list_coupon_bg_noactive" alt="Coupon Inactive">
            <svg class="swiper_list_coupon_bg_noactivemb" xmlns="http://www.w3.org/2000/svg" width="351" height="108" viewBox="0 0 351 108" fill="none">
                <mask id="path-1-inside-1_2444_18810" fill="white">
                    <path d="M228.055 0C230.12 2.87028 233.42 4.79199 237.179 4.9834V12H239.179V4.91992C242.621 4.52585 245.618 2.67517 247.543 0H336C344.284 0 351 6.71573 351 15V93C351 101.284 344.284 108 336 108H248.189C246.114 104.414 242.24 102 237.799 102C233.358 102 229.483 104.414 227.408 108H15C6.71573 108 3.8658e-07 101.284 0 93V15C3.8658e-07 6.71573 6.71573 2.23477e-07 15 0H228.055ZM237.179 102H239.179V95H237.179V102ZM237.179 94H239.179V87H237.179V94ZM237.179 86H239.179V79H237.179V86ZM237.179 78H239.179V70H237.179V78ZM237.179 69H239.179V62H237.179V69ZM237.179 61H239.179V54H237.179V61ZM237.179 53H239.179V46H237.179V53ZM237.179 45H239.179V37H237.179V45ZM237.179 36H239.179V29H237.179V36ZM237.179 28H239.179V21H237.179V28ZM237.179 20H239.179V13H237.179V20Z" />
                </mask>
                <path d="M228.055 0C230.12 2.87028 233.42 4.79199 237.179 4.9834V12H239.179V4.91992C242.621 4.52585 245.618 2.67517 247.543 0H336C344.284 0 351 6.71573 351 15V93C351 101.284 344.284 108 336 108H248.189C246.114 104.414 242.24 102 237.799 102C233.358 102 229.483 104.414 227.408 108H15C6.71573 108 3.8658e-07 101.284 0 93V15C3.8658e-07 6.71573 6.71573 2.23477e-07 15 0H228.055ZM237.179 102H239.179V95H237.179V102ZM237.179 94H239.179V87H237.179V94ZM237.179 86H239.179V79H237.179V86ZM237.179 78H239.179V70H237.179V78ZM237.179 69H239.179V62H237.179V69ZM237.179 61H239.179V54H237.179V61ZM237.179 53H239.179V46H237.179V53ZM237.179 45H239.179V37H237.179V45ZM237.179 36H239.179V29H237.179V36ZM237.179 28H239.179V21H237.179V28ZM237.179 20H239.179V13H237.179V20Z" fill="white" />
                <path d="M228.055 0L228.542 -0.350466L228.362 -0.6H228.055V0ZM237.179 4.9834H237.779V4.41318L237.209 4.38417L237.179 4.9834ZM237.179 12H236.579V12.6H237.179V12ZM239.179 12V12.6H239.779V12H239.179ZM239.179 4.91992L239.11 4.32382L238.579 4.3847V4.91992H239.179ZM247.543 0V-0.6H247.236L247.056 -0.350475L247.543 0ZM351 15H351.6H351ZM351 93H351.6H351ZM336 108V108.6V108ZM248.189 108L247.67 108.301L247.843 108.6H248.189V108ZM237.799 102V101.4H237.799L237.799 102ZM227.408 108V108.6H227.754L227.928 108.301L227.408 108ZM0 93H-0.6H0ZM0 15H-0.6H0ZM15 0V-0.6V0ZM237.179 102H236.579V102.6H237.179V102ZM239.179 102V102.6H239.779V102H239.179ZM239.179 95H239.779V94.4H239.179V95ZM237.179 95V94.4H236.579V95H237.179ZM237.179 94H236.579V94.6H237.179V94ZM239.179 94V94.6H239.779V94H239.179ZM239.179 87H239.779V86.4H239.179V87ZM237.179 87V86.4H236.579V87H237.179ZM237.179 86H236.579V86.6H237.179V86ZM239.179 86V86.6H239.779V86H239.179ZM239.179 79H239.779V78.4H237.179V79ZM237.179 79V78.4H236.579V79H237.179ZM237.179 78H236.579V78.6H237.179V78ZM239.179 78V78.6H239.779V78H239.179ZM239.179 70H239.779V69.4H239.179V70ZM237.179 70V69.4H236.579V70H237.179ZM237.179 69H236.579V69.6H237.179V69ZM239.179 69V69.6H239.779V69H239.179ZM239.179 62H239.779V61.4H239.179V62ZM237.179 62V61.4H236.579V62H237.179ZM237.179 61H236.579V61.6H237.179V61ZM239.179 61V61.6H239.779V61H239.179ZM239.179 54H239.779V53.4H239.179V54ZM237.179 54V53.4H236.579V54H237.179ZM237.179 53H236.579V53.6H237.179V53ZM239.179 53V53.6H239.779V53H239.179ZM239.179 46H239.779V45.4H239.179V46ZM237.179 46V45.4H236.579V46H237.179ZM237.179 45H236.579V45.6H237.179V45ZM239.179 45V45.6H239.779V45H239.179ZM239.179 37H239.779V36.4H239.179V37ZM237.179 37V36.4H236.579V37H237.179ZM237.179 36H236.579V36.6H237.179V36ZM239.179 36V36.6H239.779V36H239.179ZM239.179 29H239.779V28.4H239.179V29ZM237.179 29V28.4H236.579V29H237.179ZM237.179 28H236.579V28.6H237.179V28ZM239.179 28V28.6H239.779V28H239.179ZM239.179 21H239.779V20.4H239.179V21ZM237.179 21V20.4H236.579V21H237.179ZM237.179 20H236.579V20.6H237.179V20ZM239.179 20V20.6H239.779V20H239.179ZM239.179 13H239.779V12.4H239.179V13ZM237.179 13V12.4H236.579V13H237.179ZM228.055 0L227.568 0.350466C229.735 3.36264 233.2 5.38157 237.148 5.58262L237.179 4.9834L237.209 4.38417C233.64 4.20241 230.505 2.37791 228.542 -0.350466L228.055 0ZM237.179 4.9834H236.579V12H237.179H237.779V4.9834H237.179ZM237.179 12V12.6H239.179V12V11.4H237.179V12ZM239.179 12H239.779V4.91992H239.179H238.579V12H239.179ZM239.179 4.91992L239.247 5.51603C242.863 5.10204 246.01 3.1579 248.03 0.350475L247.543 0L247.056 -0.350475C245.226 2.19245 242.379 3.94966 239.11 4.32382L239.179 4.91992ZM247.543 0V0.6H336V0V-0.6H247.543V0ZM336 0V0.6C343.953 0.6 350.4 7.0471 350.4 15H351H351.6C351.6 6.38436 344.616 -0.6 336 -0.6V0ZM351 15H350.4V93H351H351.6V15H351ZM351 93H350.4C350.4 100.953 343.953 107.4 336 107.4V108V108.6C344.616 108.6 351.6 101.616 351.6 93H351ZM336 108V107.4H248.189V108V108.6H336V108ZM248.189 108L248.709 107.699C246.531 103.936 242.463 101.4 237.799 101.4V102V102.6C242.017 102.6 245.698 104.892 247.67 108.301L248.189 108ZM237.799 102L237.799 101.4C233.135 101.4 229.067 103.936 226.889 107.699L227.408 108L227.928 108.301C229.9 104.892 233.581 102.6 237.799 102.6L237.799 102ZM227.408 108V107.4H15V108V108.6H227.408V108ZM15 108V107.4C7.0471 107.4 0.6 100.953 0.6 93H0H-0.6C-0.6 101.616 6.38436 108.6 15 108.6V108ZM0 93H0.6V15H0H-0.6V93H0ZM0 15H0.6C0.6 7.0471 7.0471 0.6 15 0.6V0V-0.6C6.38436 -0.6 -0.6 6.38436 -0.6 15H0ZM15 0V0.6H228.055V0V-0.6H15V0ZM237.179 102V102.6H239.179V102V101.4H237.179V102ZM239.179 102H239.779V95H239.179H238.579V102H239.179ZM239.179 95V94.4H237.179V95V95.6H239.179V95ZM237.179 95H236.579V102H237.179H237.779V95H237.179ZM237.179 94V94.6H239.179V94V93.4H237.179V94ZM239.179 94H239.779V87H239.179H238.579V94H239.179ZM239.179 87V86.4H237.179V87V87.6H239.179V87ZM237.179 87H236.579V94H237.179H237.779V87H237.179ZM237.179 86V86.6H239.179V86V85.4H237.179V86ZM239.179 86H239.979V79H239.179H238.579V86H239.179ZM239.179 79V78.4H237.179V79V79.6H239.179V79ZM237.179 79H236.579V86H237.179H237.779V79H237.179ZM237.179 78V78.6H239.179V78V77.4H237.179V78ZM239.179 78H239.979V70H239.179H238.579V78H239.179ZM239.179 70V69.2H237.179V70V70.8H239.179V70ZM237.179 70H236.579V78H237.179H237.779V70H237.179ZM237.179 69V69.6H239.179V69V68.4H237.179V69ZM239.179 69H239.979V62H239.179H238.579V69H239.179ZM239.179 62V61.2H237.179V62V62.8H239.179V62ZM237.179 62H236.579V69H237.179H237.979V62H237.179ZM237.179 61V61.8H239.179V61V60.2H237.179V61ZM239.179 61H239.979V54H239.179H238.579V61H239.179ZM239.179 54V53.2H237.179V54V54.8H239.179V54ZM237.179 54H236.579V61H237.179H237.779V54H237.179ZM237.179 53V53.6H239.179V53V52.4H237.179V53ZM239.179 53H239.979V46H239.179H238.579V53H239.179ZM239.179 46V45.4H237.179V46V46.6H239.179V46ZM237.179 46H236.579V53H237.179H237.779V46H237.179ZM237.179 45V45.6H239.179V45V44.4H237.179V45ZM239.179 45H239.979V37H239.179H238.579V45H239.179ZM239.179 37V36.2H237.179V37V37.8H239.179V37ZM237.179 37H236.379V45H237.179H237.979V37H237.179ZM237.179 36V36.8H239.179V36V35.2H237.179V36ZM239.179 36H239.979V29H239.179H238.379V36H239.179ZM239.179 29V28.2H237.179V29V29.8H239.179V29ZM237.179 29H236.379V36H237.179H237.979V29H237.179ZM237.179 28V28.8H239.179V28V27.2H237.179V28ZM239.179 28H239.979V21H239.179H238.379V28H239.179ZM239.179 21V20.2H237.179V21V21.8H239.179V21ZM237.179 21H236.379V28H237.179H237.979V21H237.179ZM237.179 20V20.8H239.179V20V19.2H237.179V20ZM239.179 20H239.979V13H239.179H238.379V20H239.179ZM239.179 13V12.2H237.179V13V13.8H239.179V13ZM237.179 13H236.379V20H237.179H237.979V13H237.179Z" fill="black" fill-opacity="0.15" mask="url(#path-1-inside-1_2444_18810)" />
            </svg>
            <svg class="swiper_list_coupon_bgmb" xmlns="http://www.w3.org/2000/svg" width="351" height="108" viewBox="0 0 351 108" fill="none">
                <mask id="path-1-inside-1_2444_19033" fill="white">
                    <path d="M228.055 0C230.12 2.87028 233.42 4.79199 237.179 4.9834V12H239.179V4.91992C242.621 4.52585 245.618 2.67517 247.543 0H336C344.284 0 351 6.71573 351 15V93C351 101.284 344.284 108 336 108H248.189C246.114 104.414 242.24 102 237.799 102C233.358 102 229.483 104.414 227.408 108H15C6.71573 108 3.8658e-07 101.284 0 93V15C3.8658e-07 6.71573 6.71573 2.23477e-07 15 0H228.055ZM237.179 102H239.179V95H237.179V102ZM237.179 94H239.179V87H237.179V94ZM237.179 86H239.179V79H237.179V86ZM237.179 78H239.179V70H237.179V78ZM237.179 69H239.179V62H237.179V69ZM237.179 61H239.179V54H237.179V61ZM237.179 53H239.179V46H237.179V53ZM237.179 45H239.179V37H237.179V45ZM237.179 36H239.179V29H237.179V36ZM237.179 28H239.179V21H237.179V28ZM237.179 20H239.179V13H237.179V20Z" />
                </mask>
                <path d="M228.055 0C230.12 2.87028 233.42 4.79199 237.179 4.9834V12H239.179V4.91992C242.621 4.52585 245.618 2.67517 247.543 0H336C344.284 0 351 6.71573 351 15V93C351 101.284 344.284 108 336 108H248.189C246.114 104.414 242.24 102 237.799 102C233.358 102 229.483 104.414 227.408 108H15C6.71573 108 3.8658e-07 101.284 0 93V15C3.8658e-07 6.71573 6.71573 2.23477e-07 15 0H228.055ZM237.179 102H239.179V95H237.179V102ZM237.179 94H239.179V87H237.179V94ZM237.179 86H239.179V79H237.179V86ZM237.179 78H239.179V70H237.179V78ZM237.179 69H239.179V62H237.179V69ZM237.179 61H239.179V54H237.179V61ZM237.179 53H239.179V46H237.179V53ZM237.179 45H239.179V37H237.179V45ZM237.179 36H239.179V29H237.179V36ZM237.179 28H239.179V21H237.179V28ZM237.179 20H239.179V13H237.179V20Z" fill="white" />
                <path d="M228.055 0L228.704 -0.467288L228.465 -0.8H228.055V0ZM237.179 4.9834H237.979V4.2231L237.219 4.18443L237.179 4.9834ZM237.179 12H236.379V12.8H237.179V12ZM239.179 12V12.8H239.979V12H239.179ZM239.179 4.91992L239.088 4.12511L238.379 4.20629V4.91992H239.179ZM247.543 0V-0.8H247.133L246.894 -0.467299L247.543 0ZM351 15H351.8H351ZM351 93H351.8H351ZM336 108V108.8V108ZM248.189 108L247.497 108.401L247.728 108.8H248.189V108ZM237.799 102V101.2H237.799L237.799 102ZM227.408 108V108.8H227.87L228.101 108.401L227.408 108ZM0 93H-0.8H0ZM0 15H-0.8H0ZM15 0V-0.8V0ZM237.179 102H236.379V102.8H237.179V102ZM239.179 102V102.8H239.979V102H239.179ZM239.179 95H239.979V94.2H239.179V95ZM237.179 95V94.2H236.379V95H237.179ZM237.179 94H236.379V94.8H237.179V94ZM239.179 94V94.8H239.979V94H239.179ZM239.179 87H239.979V86.2H239.179V87ZM237.179 87V86.2H236.379V87H237.179ZM237.179 86H236.379V86.8H237.179V86ZM239.179 86V86.8H239.979V86H239.179ZM239.179 79H239.979V78.2H239.179V79ZM237.179 79V78.2H236.379V79H237.179ZM237.179 78H236.379V78.8H237.179V78ZM239.179 78V78.8H239.979V78H239.179ZM239.179 70H239.979V69.2H239.179V70ZM237.179 70V69.2H236.379V70H237.179ZM237.179 69H236.379V69.8H237.179V69ZM239.179 69V69.8H239.979V69H239.179ZM239.179 62H239.979V61.2H239.179V62ZM237.179 62V61.2H236.379V62H237.179ZM237.179 61H236.379V61.8H237.179V61ZM239.179 61V61.8H239.979V61H239.179ZM239.179 54H239.979V53.2H239.179V54ZM237.179 54V53.2H236.379V54H237.179ZM237.179 53H236.379V53.8H237.179V53ZM239.179 53V53.8H239.979V53H239.179ZM239.179 46H239.979V45.2H239.179V46ZM237.179 46V45.2H236.379V46H237.179ZM237.179 45H236.379V45.8H237.179V45ZM239.179 45V45.8H239.979V45H239.179ZM239.179 37H239.979V36.2H239.179V37ZM237.179 37V36.2H236.379V37H237.179ZM237.179 36H236.379V36.8H237.179V36ZM239.179 36V36.8H239.979V36H239.179ZM239.179 29H239.979V28.2H239.179V29ZM237.179 29V28.2H236.379V29H237.179ZM237.179 28H236.379V28.8H237.179V28ZM239.179 28V28.8H239.979V28H239.179ZM239.179 21H239.979V20.2H239.179V21ZM237.179 21V20.2H236.379V21H237.179ZM237.179 20H236.379V20.8H237.179V20ZM239.179 20V20.8H239.979V20H239.179ZM239.179 13H239.979V12.2H239.179V13ZM237.179 13V12.2H236.379V13H237.179ZM228.055 0L227.405 0.467288C229.607 3.52677 233.127 5.5781 237.138 5.78236L237.179 4.9834L237.219 4.18443C233.713 4.00589 230.633 2.21379 228.704 -0.467288L228.055 0ZM237.179 4.9834H236.379V12H237.179H237.979V4.9834H237.179ZM237.179 12V12.8H239.179V12V11.2H237.179V12ZM239.179 12H239.979V4.91992H239.179H238.379V12H239.179ZM239.179 4.91992L239.27 5.71473C242.944 5.29411 246.14 3.31881 248.192 0.467299L247.543 0L246.894 -0.467299C245.095 2.03154 242.298 3.75759 239.088 4.12511L239.179 4.91992ZM247.543 0V0.8H336V0V-0.8H247.543V0ZM336 0V0.8C343.842 0.8 350.2 7.15756 350.2 15H351H351.8C351.8 6.2739 344.726 -0.8 336 -0.8V0ZM351 15H350.4V93H351H351.8V15H351ZM351 93H350.4C350.4 100.842 343.842 107.2 336 107.2V108V108.8C344.726 108.8 351.8 101.726 351.8 93H351ZM336 108V107.2H248.189V108V108.8H336V108ZM248.189 108L248.882 107.599C246.67 103.777 242.537 101.2 237.799 101.2V102V102.8C241.942 102.8 245.559 105.051 247.497 108.401L248.189 108ZM237.799 102L237.799 101.2C233.06 101.2 228.928 103.777 226.716 107.599L227.408 108L228.101 108.401C230.039 105.051 233.655 102.8 237.799 102.8L237.799 102ZM227.408 108V107.2H15V108V108.8H227.408V108ZM15 108V107.2C7.15756 107.2 0.8 100.842 0.8 93H0H-0.8C-0.8 101.726 6.2739 108.8 15 108.8V108ZM0 93H0.8V15H0H-0.8V93H0ZM0 15H0.8C0.8 7.15756 7.15756 0.8 15 0.8V0V-0.8C6.2739 -0.8 -0.8 6.2739 -0.8 15H0ZM15 0V0.8H228.055V0V-0.8H15V0ZM237.179 102V102.8H239.179V102V101.2H237.179V102ZM239.179 102H239.979V95H239.179H238.379V102H239.179ZM239.179 95V94.2H237.179V95V95.8H239.179V95ZM237.179 95H236.379V102H237.179H237.979V95H237.179ZM237.179 94V94.6H239.179V94V93.4H237.179V94ZM239.179 94H239.779V87H239.179H238.379V94H239.179ZM239.179 87V86.4H237.179V87V87.6H239.179V87ZM237.179 87H236.379V94H237.179H237.979V87H237.179ZM237.179 86V86.6H239.179V86V85.4H237.179V86ZM239.179 86H239.979V79H239.179H238.579V86H239.179ZM239.179 79V78.4H237.179V79V79.6H239.179V79ZM237.179 79H236.579V86H237.179H237.779V79H237.179ZM237.179 78V78.6H239.179V78V77.4H237.179V78ZM239.179 78H239.979V70H239.179H238.579V78H239.179ZM239.179 70V69.2H237.179V70V70.8H239.179V70ZM237.179 70H236.579V78H237.179H237.779V70H237.179ZM237.179 69V69.6H239.179V69V68.4H237.179V69ZM239.179 69H239.979V62H239.179H238.579V69H239.179ZM239.179 62V61.2H237.179V62V62.8H239.179V62ZM237.179 62H236.579V69H237.179H237.979V62H237.179ZM237.179 61V61.8H239.179V61V60.2H237.179V61ZM239.179 61H239.979V54H239.179H238.579V61H239.179ZM239.179 54V53.2H237.179V54V54.8H239.179V54ZM237.179 54H236.579V61H237.179H237.779V54H237.179ZM237.179 53V53.6H239.179V53V52.4H237.179V53ZM239.179 53H239.979V46H239.179H238.579V53H239.179ZM239.179 46V45.2H237.179V46V46.8H239.179V46ZM237.179 46H236.579V53H237.179H237.779V46H237.179ZM237.179 45V45.6H239.179V45V44.4H237.179V45ZM239.179 45H239.979V37H239.179H238.579V45H239.179ZM239.179 37V36.2H237.179V37V37.8H239.179V37ZM237.179 37H236.379V45H237.179H237.979V37H237.179ZM237.179 36V36.8H239.179V36V35.2H237.179V36ZM239.179 36H239.979V29H239.179H238.379V36H239.179ZM239.179 29V28.2H237.179V29V29.8H239.179V29ZM237.179 29H236.379V36H237.179H237.979V29H237.179ZM237.179 28V28.8H239.179V28V27.2H237.179V28ZM239.179 28H239.979V21H239.179H238.379V28H239.179ZM239.179 21V20.2H237.179V21V21.8H239.179V21ZM237.179 21H236.379V28H237.179H237.979V21H237.179ZM237.179 20V20.8H239.179V20V19.2H237.179V20ZM239.179 20H239.979V13H239.179H238.379V20H239.179ZM239.179 13V12.2H237.179V13V13.8H239.179V13ZM237.179 13H236.379V20H237.179H237.979V13H237.179Z" fill="#158E5C" mask="url(#path-1-inside-1_2444_19033)" />
            </svg>
            <div class="swiper_list_coupon_content">
                <div class="radio-box">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="19" viewBox="0 0 18 19" fill="none">
                        <circle class="circle_border" cx="9" cy="9.5" r="8.1" stroke="#158E5C" stroke-width="1.8" />
                        <circle class="circle_center" cx="8.99961" cy="9.5001" r="5.4" fill="#158E5C" />
                    </svg>
                </div>
                <div class="coupon_content__wrapper">
                    <p class="coupon_content__title">${coupon.title}</p>
                    <p class="coupon_content__label">
                        <span>Expires: </span>
                        <span>${expiresText}</span>
                    </p>
                </div>
            </div>
            <div class="swiper_list_coupon_discount">
                -${coupon.discount}%
            </div>
        `;

        return couponElement;
    }

    // ✅ ADDED: Initialize coupon click events
    initCouponClickEvents() {
        const itemdiscount = document.querySelectorAll(".swiper_list_coupon .swiper-slide");
        const lotuscoupon_footer_btn = document.querySelector(".lotuscoupon_footer_btn");
        const enter_search__input = document.querySelector(".enter_search__input");

        itemdiscount.forEach((item) => {
            item.addEventListener("click", () => {
                // Disable code input when dropdown coupon is selected
                if (enter_search__input) {
                    enter_search__input.disabled = true;
                    enter_search__input.style.opacity = "0.5";
                    enter_search__input.value = "";
                }

                // Clear any applied coupon code
                this.couponCode = null;

                // Remove active from all coupons
                itemdiscount.forEach((el) => el.classList.remove("active"));
                item.classList.add("active");

                lotuscoupon_footer_btn.classList.remove("disabled");

                const lotuscoupon_footer = document.querySelector(
                    ".lotuscoupon_footer .lotuscoupon_footer_title strong"
                );

                const discountPercent = parseFloat(item.querySelector('.swiper_list_coupon_discount').textContent.replace('-', '').replace('%', ''));
                const priceDiscount = (this.calculateCurrentTotalPrice() * discountPercent) / 100;

                lotuscoupon_footer.innerText = `-${new Intl.NumberFormat(
                    "vi-VN"
                ).format(priceDiscount)}$ discount`;

                this.indexDiscoutMemo = parseInt(item.dataset.couponIndex);
                this.indexDiscout = parseInt(item.dataset.couponIndex);
                this.discoutValue = discountPercent;
                this.selectedCoupon = {
                    id: item.dataset.couponId,
                    discount: discountPercent,
                    title: item.querySelector('.coupon_content__title').textContent,
                    minimum_total_price: parseFloat(item.dataset.minimumTotalPrice) || null,
                    minimum_number: parseInt(item.dataset.minimumNumber) || null
                };

                // Gán discount vào input hidden nếu có
                const discountInput = document.getElementById('discountValueInput');
                if (discountInput) {
                    discountInput.value = discountPercent;
                }

                // Clear any coupon message
                this.showCouponMessage("");
            });
        });
    }

    // ✅ ADDED: Calculate current total price (without coupon discount)
    calculateCurrentTotalPrice() {
        let totalPrice = 0;

        // Calculate total from all confirmed days
        Object.keys(this.dailyPlans).forEach(dayNumber => {
            const dayData = this.dailyPlans[dayNumber];
            if (dayData && dayData.confirmed) {
                totalPrice += dayData.totalPrice || 0;
            }
        });

        return totalPrice;
    }

    // ✅ ADDED: Calculate current total pax
    calculateCurrentTotalPax() {
        let totalPax = 0;

        Object.keys(this.dailyPlans).forEach(dayNumber => {
            const dayData = this.dailyPlans[dayNumber];

            if (dayData && dayData.confirmed) {
                const dayPax = this.getDayPaxCount(dayNumber);

                // Handle both object and number formats
                if (typeof dayPax === 'object' && dayPax.adults !== undefined) {
                    const dayTotal = (Number(dayPax.adults) || 0) + (Number(dayPax.children) || 0);
                    totalPax += dayTotal;
                } else {
                    const dayTotal = Number(dayPax) || 0;
                    totalPax += dayTotal;
                }
            }
        });

        return totalPax;
    }

    // ✅ ADDED: Handle coupon code input
    initCouponCodeInput() {
        const enter_search__input = document.querySelector(".enter_search__input");
        const enter_search__btn = document.querySelector(".enter_search__btn");
        const itemdiscount = document.querySelectorAll(".swiper_list_coupon .swiper-slide");

        if (enter_search__input && enter_search__btn) {
            enter_search__btn.addEventListener("click", async () => {
                const couponCode = enter_search__input.value.trim();
                if (!couponCode) {
                    this.showCouponMessage("Please enter a coupon code", "error");
                    return;
                }

                // Disable dropdown coupons when entering code
                this.disableCouponDropdown();

                try {
                    const coupon = await this.validateCouponCode(couponCode);
                    if (coupon) {
                        this.applyCouponCode(coupon);
                    }
                } catch (error) {
                    this.showCouponMessage(error.message, "error");
                }
            });
        }
    }

    // ✅ ADDED: Validate coupon code via API
    async validateCouponCode(code) {
        try {
            const currentTotalPrice = this.calculateCurrentTotalPrice();
            const currentTotalPax = this.calculateCurrentTotalPax();
            const lang = window._LANG || 'en';

            const response = await fetch(`/wp-json/api/v1/check-coupon`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: code,
                    total_amount: currentTotalPrice,
                    total_pax: currentTotalPax,
                    lang: lang
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Invalid coupon code");
            }

            const data = await response.json();
            return data;
        } catch (error) {
            throw new Error(error.message || "Invalid coupon code");
        }
    }

    // ✅ ADDED: Apply coupon code
    applyCouponCode(coupon) {
        this.discoutValue = parseFloat(coupon.discount);
        this.couponCode = coupon.code;

        // Gán discount vào input hidden nếu có
        const discountInput = document.getElementById('discountValueInput');
        if (discountInput) {
            discountInput.value = this.discoutValue;
        }

        // Update UI
        const lotuscoupon_footer = document.querySelector(".lotuscoupon_footer .lotuscoupon_footer_title strong");
        const priceDiscount = (this.calculateCurrentTotalPrice() * this.discoutValue) / 100;

        lotuscoupon_footer.innerText = `-${new Intl.NumberFormat("vi-VN").format(priceDiscount)}$ discount`;
        this.showCouponMessage(`Coupon applied: ${this.discoutValue}% off`, "success");

        this.updateToPrice();

        // ✅ ADDED: Update gift display when coupon is applied
        if (window.giftSelectionManager) {
            window.giftSelectionManager.updateGiftDisplay();
        }
    }

    // ✅ ADDED: Disable coupon dropdown when code is entered
    disableCouponDropdown() {
        const itemdiscount = document.querySelectorAll(".swiper_list_coupon .swiper-slide");
        const enter_search__input = document.querySelector(".enter_search__input");

        itemdiscount.forEach(item => {
            item.classList.remove("active");
            item.style.opacity = "0.5";
            item.style.pointerEvents = "none";
        });

        // Clear any selected dropdown coupon
        this.indexDiscout = null;

        // Disable input if dropdown is selected
        if (this.indexDiscout !== null) {
            enter_search__input.disabled = true;
            enter_search__input.style.opacity = "0.5";
        }

        // ✅ ADDED: Update gift display when coupon dropdown is disabled
        if (window.giftSelectionManager) {
            window.giftSelectionManager.updateGiftDisplay();
        }
    }

    // ✅ ADDED: Enable coupon dropdown when code is cleared
    enableCouponDropdown() {
        const itemdiscount = document.querySelectorAll(".swiper_list_coupon .swiper-slide");
        const enter_search__input = document.querySelector(".enter_search__input");

        itemdiscount.forEach(item => {
            item.style.opacity = "1";
            item.style.pointerEvents = "auto";
        });

        // Enable input
        enter_search__input.disabled = false;
        enter_search__input.style.opacity = "1";
        enter_search__input.value = "";

        // Clear coupon code
        this.couponCode = null;
        this.discoutValue = null;

        // ✅ ADDED: Update gift display when coupon is cleared
        if (window.giftSelectionManager) {
            window.giftSelectionManager.updateGiftDisplay();
        }

        // ✅ ADDED: Update gift display when coupon dropdown is enabled
        if (window.giftSelectionManager) {
            window.giftSelectionManager.updateGiftDisplay();
        }
    }

    // ✅ ADDED: Show coupon message
    showCouponMessage(message, type = "info") {
        const enter_search__noti = document.querySelector(".enter_search__noti");
        if (enter_search__noti) {
            enter_search__noti.textContent = message;
            enter_search__noti.className = `enter_search__noti ${type}`;
        }
    }

    // ✅ ADDED: Update total price with coupon discount
    updateToPrice() {
        const currentTotalPrice = this.calculateCurrentTotalPrice();
        let finalPrice = currentTotalPrice;
        let discountAmount = 0;

        // Apply coupon discount if available
        if (this.discoutValue && this.discoutValue > 0) {
            discountAmount = (currentTotalPrice * this.discoutValue) / 100;
            finalPrice = currentTotalPrice - discountAmount;
        }

        // Update sidebar total price
        const sidebarTotal = document.querySelector('.summary-total .total-price');
        if (sidebarTotal) {
            sidebarTotal.textContent = `$${new Intl.NumberFormat("vi-VN").format(finalPrice)}`;
        }

        // Update coupon footer if popup is open
        const lotuscoupon_footer = document.querySelector(".lotuscoupon_footer .lotuscoupon_footer_title strong");
        if (lotuscoupon_footer && (this.discoutValue || this.couponCode)) {
            lotuscoupon_footer.innerText = `-${new Intl.NumberFormat("vi-VN").format(discountAmount)}$ discount`;
        }

        // ✅ ADDED: Update gift display when total price changes
        if (window.giftSelectionManager) {
            window.giftSelectionManager.updateGiftDisplay();
        }

        // ✅ ADDED: Update coupon and gift visibility when total price changes
        this.updateCouponAndGiftVisibility();
    }

    // ✅ ADDED: Update coupon availability when total price changes
    updateCouponAvailability() {
        const currentTotalPrice = this.calculateCurrentTotalPrice();

        // If a coupon is applied but total is now too low, clear it
        if (this.selectedCoupon && this.selectedCoupon.minimum_total_price) {
            if (currentTotalPrice < this.selectedCoupon.minimum_total_price) {
                this.clearAppliedCoupon();
                this.showCouponMessage("Coupon removed: total amount too low", "warning");
            }
        }

        // If a coupon is applied but pax is now too low, clear it
        if (this.selectedCoupon && this.selectedCoupon.minimum_number) {
            const currentTotalPax = this.calculateCurrentTotalPax();
            if (currentTotalPax < this.selectedCoupon.minimum_number) {
                this.clearAppliedCoupon();
                this.showCouponMessage("Coupon removed: minimum number of people not met", "warning");
            }
        }

        // ✅ ADDED: Update gift display when total price changes
        if (window.giftSelectionManager) {
            window.giftSelectionManager.updateGiftDisplay();
        }
    }

    // ✅ ADDED: Clear applied coupon
    clearAppliedCoupon() {
        this.discoutValue = null;
        this.couponCode = null;
        this.selectedCoupon = null;
        this.indexDiscout = null;

        // Clear UI
        const itemdiscount = document.querySelectorAll(".swiper_list_coupon .swiper-slide");
        itemdiscount.forEach(item => {
            item.classList.remove("active");
        });

        const enter_search__input = document.querySelector(".enter_search__input");
        if (enter_search__input) {
            enter_search__input.value = "";
            enter_search__input.disabled = false;
            enter_search__input.style.opacity = "1";
        }

        // Update sidebar
        this.updateSidebarWithCoupon();

        // ✅ ADDED: Update gift display when coupon is cleared
        if (window.giftSelectionManager) {
            window.giftSelectionManager.updateGiftDisplay();
        }
    }

    // ✅ ADDED: Update sidebar with coupon discount
    updateSidebarWithCoupon() {
        const currentTotalPrice = this.calculateCurrentTotalPrice();
        let finalPrice = currentTotalPrice;
        let discountAmount = 0;

        // Apply coupon discount if available
        if (this.discoutValue && this.discoutValue > 0) {
            discountAmount = (currentTotalPrice * this.discoutValue) / 100;
            finalPrice = currentTotalPrice - discountAmount;
        }

        // Update sidebar total price
        const sidebarTotal = document.querySelector('.summary-total .total-price');
        if (sidebarTotal) {
            sidebarTotal.textContent = `$${new Intl.NumberFormat("vi-VN").format(finalPrice)}`;
        }

        // Update coupon section in sidebar if exists
        const couponSection = document.querySelector('.coupon-section');
        if (couponSection) {
            if (this.discoutValue && this.discoutValue > 0) {
                const couponText = this.couponCode ?
                    `Coupon: ${this.couponCode} (-${this.discoutValue}%)` :
                    `Coupon: ${this.selectedCoupon?.title || 'Selected'} (-${this.discoutValue}%)`;
                couponSection.innerHTML = `<p>${couponText}</p>`;
            } else {
                couponSection.innerHTML = `<p>Lotus Coupon</p>`;
            }
        }

        // ✅ ADDED: Update gift display when total price changes
        if (window.giftSelectionManager) {
            window.giftSelectionManager.updateGiftDisplay();
        }
    }

    // ✅ ADDED: Update coupon and gift section visibility when day is confirmed
    updateCouponAndGiftVisibility() {
        const hasConfirmedDays = Object.values(this.dailyPlans).some(day => day.confirmed);

        // Check current step from DOM
        const activeStepContent = document.querySelector('.step-content.active');
        const currentStepFromDOM = activeStepContent ?
            Array.from(document.querySelectorAll('.step-content')).indexOf(activeStepContent) + 1 : 1;


        // Sidebar
        const giftSection = document.querySelector('.gift-section');
        const couponSection = document.querySelector('.coupon-section');
        // Popup/section ngoài sidebar
        const bookthistourGift = document.querySelector('.bookthistour__gift');

        // Step 2: luôn hiển thị gift, ẩn coupon (trừ khi đã confirm)
        if (currentStepFromDOM === 2) {
            if (giftSection) giftSection.classList.add('active');
            if (bookthistourGift) bookthistourGift.style.display = 'block';
            if (couponSection) couponSection.classList.remove('active');
            // Nếu đã confirm ít nhất 1 ngày thì hiển thị coupon
            if (hasConfirmedDays) {
                if (couponSection) couponSection.classList.add('active');
            }
        } else if (currentStepFromDOM === 3) {
            // Step 3: ẩn bookthistour__gift, sidebar vẫn hiển thị gift + coupon
            if (giftSection) giftSection.classList.add('active');
            if (bookthistourGift) bookthistourGift.style.display = 'none';
            if (couponSection) couponSection.classList.add('active');
        } else {
            // Các step khác (bao gồm step 1): ẩn hết
            if (giftSection) giftSection.classList.remove('active');
            if (bookthistourGift) bookthistourGift.style.display = 'none';
            if (couponSection) couponSection.classList.remove('active');
        }

        this.updateCouponAvailability();
    }

    // ✅ ADDED: Ensure coupon discount is applied when switching steps
    ensureCouponDiscountApplied() {
        if (this.selectedCoupon && this.discoutValue && this.discoutValue > 0) {
            this.updateToPrice();
        }
    }
}

// Export to global window object
window.DailyPlanForm = DailyPlanForm;
