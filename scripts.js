// Region and City Management
class RegionCityManager {
    constructor() {
        this.regions = [
            { value: "north", label: "Miền Bắc", slug: "north" },
            { value: "central-vietnam", label: "Miền Trung", slug: "central-vietnam" },
            { value: "south", label: "Miền Nam", slug: "south" },
            { value: "phu-quoc-island", label: "Phú Quốc", slug: "phu-quoc-island" }
        ]
        this.currentCities = {} // Cache cities by region để tránh call api
    }

    // ** Hàm fetch cities by region **
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

    async loadCitiesForRegion(regionSlug) {
        // Nếu đã có cache thì trả về cache
        if (this.currentCities[regionSlug]) {
            return this.currentCities[regionSlug]
        }
        // Nếu không có cache thì call api
        try {
            const cities = await this.fetchDestinationChildren(regionSlug)
            // Lưu cache
            this.currentCities[regionSlug] = cities
            return cities
        } catch (error) {
            console.error(`Error loading cities for region ${regionSlug}:`, error)
            return []
        }
    }

    // ** Hàm lấy label của region **
    getRegionLabel(regionValue) {
        const region = this.regions.find(r => r.value === regionValue)
        return region ? region.label : regionValue
    }
}

// Tour Management
class TourManager {
    constructor() {
        this.tourTypes = []
        this.loadTourTypesFromHTML()
    }

    loadTourTypesFromHTML() {
        // Lấy HTML template
        const template = document.getElementById("daily-plan-template")
        if (!template) return

        // Query tất cả tour type options từ template
        const tourTypeOptions = template.content.querySelectorAll(".tour-type-dropdown .dropdown-option")

        // Transform sang array object
        this.tourTypes = Array.from(tourTypeOptions).map(option => ({
            value: option.getAttribute("data-value"),
            label: option.textContent.trim()
        }))
    }

    getTourTypeLabel(tourTypeValue) {
        const template = document.getElementById("daily-plan-template")
        if (!template) return tourTypeValue

        // Tìm option element có data-value tương ứng
        const option = template.content.querySelector(`[data-value="${tourTypeValue}"]`)
        return option ? option.textContent.trim() : tourTypeValue
    }

    async fetchToursFromAPI(destination, tourType) {
        // This method should be implemented by DailyPlanForm class
        // Remove the recursive call that causes infinite loop
        console.warn('TourManager.fetchToursFromAPI should be implemented by DailyPlanForm')
        return []
    }
}

// Vehicle Management
class VehicleManager {
    constructor() {
        this.vehicleCache = {} // Cache vehicle by pax, type, tourId
    }

    async fetchVehicle(pax, type, tourId) {
        try {
            // Nếu không có tourId thì không fetch
            if (!tourId) {
                console.warn('VehicleManager: No tour selected, cannot fetch vehicle')
                return null
            }

            console.log(`VehicleManager: Fetching vehicle for tourId=${tourId}, type=${type}, pax=${pax}`)

            const response = await fetch(`https://lotus.okhub-tech.com/wp-json/custom/v1/vehicle-options?type=${type}&pax=${pax}&post_id=${tourId}`)

            if (!response.ok) {
                throw new Error(`Vehicle API response not ok: ${response.status}`)
            }

            const data = await response.json()
            console.log(`VehicleManager: Vehicle data received:`, data)

            // Validate essential fields
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid vehicle data format')
            }

            return data
        } catch (error) {
            console.error('VehicleManager: Error fetching vehicle from API:', error)

            // Return fallback data instead of null
            const fallbackData = {
                title: `${type === 'vip' ? 'VIP' : 'Standard'} Vehicle`,
                price: type === 'vip' ? "2000" : "1500",
                gallery: [
                    "https://lotus.okhub-tech.com/wp-content/uploads/2025/07/f8db611af1aa926ea29a0ff936ef26f4b3e33a12.png"
                ]
            }

            console.log('VehicleManager: Using fallback data:', fallbackData)
            return fallbackData
        }
    }

    calculatePriceByAge(totalPriceFromAPI, totalPax, adults, children1, children2, children3) {
        if (totalPax === 0) return 0

        // Tính giá cho mỗi người (chia cho tổng số pax)
        const basePricePerPerson = totalPriceFromAPI / totalPax

        // Tính giá thực tế dựa trên số lượng người và tỷ lệ giá
        const actualPrice = (
            (adults * 1.0) +           // Adults: 100%
            (children1 * 0.0) +        // Children1: Free (0%)
            (children2 * 0.6) +        // Children2: 60%
            (children3 * 0.8)          // Children3: 80%
        ) * basePricePerPerson

        console.log(`calculatePriceByAge: ${adults}adults + ${children1}ch1 + ${children2}ch2 + ${children3}ch3 = ${actualPrice.toFixed(2)} (base: ${basePricePerPerson.toFixed(2)}, totalPax: ${totalPax})`)

        return actualPrice
    }
}

// Guide Management  
class GuideManager {
    constructor() {
        this.guideOptions = [
            { value: "english", label: "English", flag: "🇬🇧" },
            { value: "chinese", label: "Chinese", flag: "🇨🇳" },
            { value: "korean", label: "Korean", flag: "🇰🇷" },
            { value: "spanish", label: "Spanish", flag: "🇪🇸" },
            { value: "japanese", label: "Japanese", flag: "🇯🇵" },
            { value: "vietnamese", label: "Vietnamese", flag: "🇻🇳" },
            { value: "laos", label: "Laos", flag: "🇱🇦" },
            { value: "cambodian", label: "Cambodian", flag: "🇰🇭" },
            { value: "thai", label: "Thai", flag: "🇹🇭" }
        ]
    }

    getGuideOptions() {
        return this.guideOptions
    }

    getGuideLabel(value) {
        const guide = this.guideOptions.find(g => g.value === value)
        return guide ? `${guide.flag} ${guide.label}` : value
    }
}

// Hotel Management - API Integration
class HotelManager {
    constructor() {
        this.hotelCache = {}
        this.currentHotels = []
    }

    async fetchHotels(postId = 467, lang = 'en') {
        const cacheKey = `${postId}-${lang}`

        // Check cache first
        if (this.hotelCache[cacheKey]) {
            console.log(`Using cached hotels for ${cacheKey}:`, this.hotelCache[cacheKey])
            return this.hotelCache[cacheKey]
        }

        try {
            console.log('Fetching hotels from API for post_id:', postId)
            const response = await fetch(`https://lotus.okhub-tech.com/wp-json/custom/v1/hotel-options?post_id=${postId}&lang=${lang}`)

            if (!response.ok) {
                throw new Error(`Hotel API response not ok: ${response.status}`)
            }

            const data = await response.json()
            console.log('Raw Hotel API response:', data)

            if (!Array.isArray(data)) {
                console.error('Hotel API response is not an array:', data)
                return this.getDefaultHotels()
            }

            // Transform API data to expected format
            const transformedHotels = data.map((hotel, index) => {
                return {
                    id: hotel.hotel_id || `hotel-${index}`,
                    name: hotel.hotel_name || `Hotel ${index + 1}`,
                    price: parseInt(hotel.price) || 50,
                    gallery: hotel.gallery || [],
                    value: hotel.hotel_name ? hotel.hotel_name.toLowerCase().replace(/\s+/g, '-') : `hotel-${index}`
                }
            })

            console.log('Transformed hotels:', transformedHotels)

            // Cache the result
            this.hotelCache[cacheKey] = transformedHotels
            this.currentHotels = transformedHotels

            return transformedHotels

        } catch (error) {
            console.error('Error fetching hotels from API:', error)
            return this.getDefaultHotels()
        }
    }

    getDefaultHotels() {
        return [
            {
                id: 766,
                name: 'Lotus Economy',
                price: 50,
                gallery: [
                    'https://lotus.okhub-tech.com/wp-content/uploads/2025/07/image-16.webp',
                    'https://lotus.okhub-tech.com/wp-content/uploads/2025/07/image-16.webp',
                    'https://lotus.okhub-tech.com/wp-content/uploads/2025/07/image-16.webp',
                    'https://lotus.okhub-tech.com/wp-content/uploads/2025/07/image-16.webp'
                ],
                value: 'lotus-economy'
            },
            {
                id: 765,
                name: 'Lotus Deluxe',
                price: 60,
                gallery: [
                    'https://lotus.okhub-tech.com/wp-content/uploads/2025/07/image-16.webp',
                    'https://lotus.okhub-tech.com/wp-content/uploads/2025/07/image-16.webp',
                    'https://lotus.okhub-tech.com/wp-content/uploads/2025/07/image-16.webp',
                    'https://lotus.okhub-tech.com/wp-content/uploads/2025/07/image-16.webp'
                ],
                value: 'lotus-deluxe'
            },
            {
                id: 770,
                name: 'Lotus Premium',
                price: 70,
                gallery: [
                    'https://lotus.okhub-tech.com/wp-content/uploads/2025/07/image-16.webp',
                    'https://lotus.okhub-tech.com/wp-content/uploads/2025/07/image-16.webp',
                    'https://lotus.okhub-tech.com/wp-content/uploads/2025/07/image-16.webp',
                    'https://lotus.okhub-tech.com/wp-content/uploads/2025/07/image-16.webp'
                ],
                value: 'lotus-premium'
            },
            {
                id: 772,
                name: 'Lotus VIP',
                price: 100,
                gallery: [
                    'https://lotus.okhub-tech.com/wp-content/uploads/2025/07/image-16.webp',
                    'https://lotus.okhub-tech.com/wp-content/uploads/2025/07/image-16.webp',
                    'https://lotus.okhub-tech.com/wp-content/uploads/2025/07/image-16.webp',
                    'https://lotus.okhub-tech.com/wp-content/uploads/2025/07/image-16.webp'
                ],
                value: 'lotus-vip'
            }
        ]
    }

    renderHotelOptions(dayNumber, hotels, roomCount = 2) {
        const hotelOptionsContainer = document.querySelector(`#day-${dayNumber} .hotel-options`) ||
            document.getElementById(`hotelOptions-${dayNumber}`)

        if (!hotelOptionsContainer) {
            console.warn(`Hotel options container not found for day ${dayNumber}`)
            return
        }

        hotelOptionsContainer.innerHTML = ''

        hotels.forEach((hotel, index) => {
            const hotelOption = document.createElement('label')
            hotelOption.className = 'hotel-option'
            hotelOption.setAttribute('data-price', hotel.price)

            hotelOption.innerHTML = `
                <input type="radio" class="hotel-radio" value="${hotel.value}" name="hotel-${dayNumber}" ${index === 0 ? 'checked' : ''}>
                <div class="hotel-details">
                    <h4 class="hotel-title">${hotel.name}</h4>
                    <p class="hotel-price">${hotel.price}usd/night/room <span class="hotel-pax">(2pax/room)</span> x
                        <span class="hotel-room-count">${roomCount}</span>
                    </p>
                </div>
            `

            hotelOptionsContainer.appendChild(hotelOption)
        })

        // Update gallery for first hotel by default
        if (hotels.length > 0) {
            this.updateHotelGallery(dayNumber, hotels[0])
        }
    }

    updateHotelGallery(dayNumber, hotel) {
        const hotelGallery = document.querySelector(`#day-${dayNumber} .hotel-gallery`) ||
            document.getElementById(`hotelGallery-${dayNumber}`)

        if (!hotelGallery) {
            console.warn(`Hotel gallery not found for day ${dayNumber}`)
            return
        }

        hotelGallery.innerHTML = ''

        hotel.gallery.forEach((imageUrl, index) => {
            const img = document.createElement('img')
            img.src = imageUrl
            img.alt = `${hotel.name} Room ${index + 1}`
            hotelGallery.appendChild(img)
        })

        // Update images title
        const imagesTitle = document.querySelector(`#day-${dayNumber} .hotel-images h4`)
        if (imagesTitle) {
            imagesTitle.innerHTML = `Images for: <span class="selected-hotel-name">${hotel.name}</span>`
        }
    }
}

// Service Management (Food, Hotel, Extra Bed)
class ServiceManager {
    constructor() {
        this.foodOptions = {
            'vietnamese': 'Vietnam Cuisine',
            'seafood': 'Premium Seafood Buffet',
            'michelin': 'Michelin - Recommended Dining',
            'french': 'French Fine Dining'
        }

        this.hotelOptions = {
            'lotus-economy': 'Lotus Economy',
            'lotus-deluxe': 'Lotus Deluxe',
            'lotus-premium': 'Lotus Premium',
            'lotus-vip': 'Lotus VIP'
        }
    }

    getFoodOptionLabel(value) {
        return this.foodOptions[value] || 'Selected Food'
    }

    getHotelOptionLabel(value) {
        return this.hotelOptions[value] || value
    }
}

// Price Calculator
class PriceCalculator {
    constructor(bookingForm) {
        this.bookingForm = bookingForm
    }

    calculateDayTotalPrice(dayNumber, dailyPlans) {
        const day = dailyPlans[dayNumber]
        if (!day) return 0

        let totalPrice = 0

        // Add total-day price
        const totalPriceDayElement = document.getElementById(`totalPriceDay-${dayNumber}`)
        if (totalPriceDayElement) {
            const totalDayPrice = totalPriceDayElement.textContent.replace(/[^0-9.]/g, '') || '0'
            const totalDayPriceValue = parseFloat(totalDayPrice)
            if (!isNaN(totalDayPriceValue)) {
                totalPrice += totalDayPriceValue
            }
        }

        // Calculate food price
        if (day.food) {
            const selectedOption = document.querySelector(`#day-${dayNumber} .food-radio[value="${day.food}"]`)
            const foodPrice = selectedOption?.closest('.food-option')?.getAttribute('data-price') || '0'

            // Get correct pax count based on mode
            const isCustomizeMode = this.bookingForm.tourInfoForm.isCustomizeMode()
            const paxData = isCustomizeMode
                ? this.bookingForm.tourInfoForm.getDayPaxCount(dayNumber)
                : this.bookingForm.tourInfoForm.getTotalPaxCount()

            const totalPax = paxData.totalPax
            const totalFoodPrice = parseFloat(foodPrice) * totalPax

            if (!isNaN(totalFoodPrice)) {
                totalPrice += totalFoodPrice
            }
        }

        // Calculate hotel price
        if (day.hotel && day.roomCount) {
            const selectedOption = document.querySelector(`#day-${dayNumber} .hotel-radio[value="${day.hotel}"]`)
            const hotelPrice = selectedOption?.closest('.hotel-option')?.getAttribute('data-price') || '0'
            const totalHotelPrice = parseFloat(hotelPrice) * day.roomCount
            if (!isNaN(totalHotelPrice)) {
                totalPrice += totalHotelPrice
            }
        }

        // Add extra bed price
        if (day.extraBed === 'add-extra-bed' && day.extraBedCount > 0) {
            const extraBedPrice = day.extraBedCount * 10
            totalPrice += extraBedPrice
        }

        // Note: Tour price is included in total-day price from vehicle, not separate

        return totalPrice
    }

    calculateGrandTotal(dailyPlans) {
        let grandTotal = 0

        Object.keys(dailyPlans).forEach(dayNumber => {
            const day = dailyPlans[dayNumber]
            if (day.confirmed && !day.noService && day.totalPrice) {
                grandTotal += day.totalPrice
            }
        })

        return grandTotal
    }
}

// Form State Manager
class FormStateManager {
    constructor(dailyPlanForm) {
        this.dailyPlanForm = dailyPlanForm
    }

    restoreFormState(dailyPlans) {
        Object.keys(dailyPlans).forEach(dayNumber => {
            const dayData = dailyPlans[dayNumber]
            if (!dayData) return

            console.log(`Restoring state for day ${dayNumber}:`, dayData)

            if (dayData.confirmed) {
                this.dailyPlanForm.collapseDay(dayNumber, dayData)
                return
            }

            if (dayData.noService) {
                const noServiceCheckbox = document.getElementById(`noService-${dayNumber}`)
                if (noServiceCheckbox) {
                    noServiceCheckbox.checked = true
                    this.dailyPlanForm.toggleNoService(dayNumber, true)
                }
                return
            }

            this.restoreDaySelections(dayNumber, dayData)
        })
    }

    restoreDaySelections(dayNumber, dayData) {
        // Restore location/region selection
        if (dayData.location) {
            const locationRadio = document.querySelector(`input[name="location-${dayNumber}"][value="${dayData.location}"]`)
            if (locationRadio) {
                locationRadio.checked = true

                // Store location selection in dailyPlans
                if (!this.dailyPlanForm.dailyPlans[dayNumber]) {
                    this.dailyPlanForm.dailyPlans[dayNumber] = {}
                }
                this.dailyPlanForm.dailyPlans[dayNumber].location = dayData.location

                // Don't trigger change event immediately - let restore process handle it
                // locationRadio.dispatchEvent(new Event('change'))

                // Load cities for this region with a small delay
                setTimeout(() => {
                    console.log(`Loading cities for day ${dayNumber}, region: ${dayData.location}`)
                    this.dailyPlanForm.updateCityOptions(dayNumber, dayData.location)
                }, 50)

                console.log(`Restored location selection for day ${dayNumber}: ${dayData.location}`)
            }
        }

        // Restore other selections with timeouts
        this.restoreWithDelay(dayNumber, dayData)
    }

    restoreWithDelay(dayNumber, dayData) {
        const delays = [
            { delay: 150, action: () => this.restoreCitySelection(dayNumber, dayData) }, // Increased delay to allow cities to load
            { delay: 250, action: () => this.restoreTourTypeSelection(dayNumber, dayData) },
            { delay: 350, action: () => this.restoreGuideSelection(dayNumber, dayData) },
            { delay: 450, action: () => this.restoreItinerarySelection(dayNumber, dayData) },
            { delay: 550, action: () => this.restoreFoodSelection(dayNumber, dayData) },
            { delay: 650, action: () => this.restoreHotelSelection(dayNumber, dayData) },
            { delay: 750, action: () => this.restoreExtraBedSelection(dayNumber, dayData) },
            { delay: 850, action: () => this.restoreRoomCount(dayNumber, dayData) },
            { delay: 950, action: () => this.restoreExtraBedCount(dayNumber, dayData) },
            // Note: Selected tour is now restored in restoreTourTypeSelection to avoid duplication
            { delay: 1150, action: () => this.restoreServiceCheckboxes(dayNumber, dayData) },
            { delay: 1250, action: () => this.dailyPlanForm.checkAndShowProgressiveSections(dayNumber) },
            { delay: 1260, action: () => console.log(`All restore delays completed for day ${dayNumber}`) }
        ]

        delays.forEach(({ delay, action }) => {
            setTimeout(action, delay)
        })
    }

    restoreCitySelection(dayNumber, dayData) {
        if (dayData.city && dayData.cityValue) {
            const citySearch = document.getElementById(`city-${dayNumber}`)
            if (citySearch) {
                // Only restore if not already set
                if (!citySearch.value || citySearch.value !== dayData.city) {
                    citySearch.value = dayData.city
                    citySearch.dataset.value = dayData.cityValue

                    // Store city selection in dailyPlans
                    if (!this.dailyPlanForm.dailyPlans[dayNumber]) {
                        this.dailyPlanForm.dailyPlans[dayNumber] = {}
                    }
                    this.dailyPlanForm.dailyPlans[dayNumber].city = dayData.city
                    this.dailyPlanForm.dailyPlans[dayNumber].cityValue = dayData.cityValue

                    console.log(`Restored city selection for day ${dayNumber}: ${dayData.city} (${dayData.cityValue})`)
                }
            }
        }
    }

    restoreTourTypeSelection(dayNumber, dayData) {
        if (dayData.tourType && dayData.tourTypeValue) {
            const tourTypeSearch = document.getElementById(`tourType-${dayNumber}`)
            if (tourTypeSearch) {
                tourTypeSearch.value = dayData.tourType
                tourTypeSearch.dataset.value = dayData.tourTypeValue

                // Store tour type selection in dailyPlans
                if (!this.dailyPlanForm.dailyPlans[dayNumber]) {
                    this.dailyPlanForm.dailyPlans[dayNumber] = {}
                }
                this.dailyPlanForm.dailyPlans[dayNumber].tourType = dayData.tourType
                this.dailyPlanForm.dailyPlans[dayNumber].tourTypeValue = dayData.tourTypeValue

                if (dayData.cityValue) {
                    // Check if we have cached tours data first
                    if (dayData.toursData && Array.isArray(dayData.toursData)) {
                        console.log(`Using cached tours data for day ${dayNumber}`)
                        this.dailyPlanForm.renderTours(dayNumber, dayData.toursData)

                        // Restore selected tour after rendering tours
                        if (dayData.selectedTour) {
                            setTimeout(() => {
                                this.restoreSelectedTour(dayNumber, dayData)
                            }, 100)
                        }
                    } else {
                        console.log(`Fetching tours for day ${dayNumber} during restore`)
                        this.dailyPlanForm.fetchToursFromAPI(dayData.cityValue, dayData.tourTypeValue)
                            .then(tours => {
                                this.dailyPlanForm.renderTours(dayNumber, tours)
                                // Store for future use
                                this.dailyPlanForm.dailyPlans[dayNumber].toursData = tours

                                // Restore selected tour after rendering tours
                                if (dayData.selectedTour) {
                                    setTimeout(() => {
                                        this.restoreSelectedTour(dayNumber, dayData)
                                    }, 100)
                                }
                            })
                    }
                }

                console.log(`Restored tour type selection for day ${dayNumber}: ${dayData.tourType}`)
            }
        }
    }

    restoreGuideSelection(dayNumber, dayData) {
        if (dayData.guide && dayData.guideValue) {
            const guideSearch = document.getElementById(`guide-${dayNumber}`)
            if (guideSearch) {
                guideSearch.value = dayData.guide
                guideSearch.dataset.value = dayData.guideValue

                // Store guide selection in dailyPlans
                if (!this.dailyPlanForm.dailyPlans[dayNumber]) {
                    this.dailyPlanForm.dailyPlans[dayNumber] = {}
                }
                this.dailyPlanForm.dailyPlans[dayNumber].guide = dayData.guide
                this.dailyPlanForm.dailyPlans[dayNumber].guideValue = dayData.guideValue

                console.log(`Restored guide selection for day ${dayNumber}: ${dayData.guide}`)
            }
        }
    }

    restoreItinerarySelection(dayNumber, dayData) {
        if (dayData.itinerary) {
            const itineraryRadio = document.querySelector(`input[name="itinerary-${dayNumber}"][value="${dayData.itinerary}"]`)
            if (itineraryRadio) {
                itineraryRadio.checked = true

                // Store itinerary selection in dailyPlans without triggering vehicle API
                if (!this.dailyPlanForm.dailyPlans[dayNumber]) {
                    this.dailyPlanForm.dailyPlans[dayNumber] = {}
                }
                this.dailyPlanForm.dailyPlans[dayNumber].itinerary = dayData.itinerary

                console.log(`Restored itinerary selection for day ${dayNumber}: ${dayData.itinerary}`)
            }
        }
    }

    restoreFoodSelection(dayNumber, dayData) {
        if (dayData.food) {
            const foodRadio = document.querySelector(`input[name="food-${dayNumber}"][value="${dayData.food}"]`)
            if (foodRadio) {
                foodRadio.checked = true

                // Store food selection in dailyPlans
                if (!this.dailyPlanForm.dailyPlans[dayNumber]) {
                    this.dailyPlanForm.dailyPlans[dayNumber] = {}
                }
                this.dailyPlanForm.dailyPlans[dayNumber].food = dayData.food

                console.log(`Restored food selection for day ${dayNumber}: ${dayData.food}`)
            }
        }
    }

    restoreHotelSelection(dayNumber, dayData) {
        if (dayData.hotel) {
            const hotelRadio = document.querySelector(`input[name="hotel-${dayNumber}"][value="${dayData.hotel}"]`)
            if (hotelRadio) {
                hotelRadio.checked = true

                // Store hotel selection in dailyPlans
                if (!this.dailyPlanForm.dailyPlans[dayNumber]) {
                    this.dailyPlanForm.dailyPlans[dayNumber] = {}
                }
                this.dailyPlanForm.dailyPlans[dayNumber].hotel = dayData.hotel

                console.log(`Restored hotel selection for day ${dayNumber}: ${dayData.hotel}`)
            }
        }
    }

    restoreExtraBedSelection(dayNumber, dayData) {
        if (dayData.extraBed) {
            const extraBedRadio = document.querySelector(`input[name="extra-bed-${dayNumber}"][value="${dayData.extraBed}"]`)
            if (extraBedRadio) {
                extraBedRadio.checked = true

                // Show/hide extra bed input group based on selection
                const extraBedInputGroup = document.querySelector(`#extraBedInputGroup-${dayNumber}`)
                if (extraBedInputGroup) {
                    if (dayData.extraBed === 'add-extra-bed') {
                        extraBedInputGroup.style.display = 'block'
                    } else {
                        extraBedInputGroup.style.display = 'none'
                    }
                }

                console.log(`Restored extra bed selection for day ${dayNumber}: ${dayData.extraBed}`)
            }
        }
    }

    restoreRoomCount(dayNumber, dayData) {
        if (dayData.roomCount) {
            const roomCountElement = document.getElementById(`roomCount-${dayNumber}`)
            if (roomCountElement) {
                roomCountElement.textContent = dayData.roomCount.toString().padStart(2, "0")

                // Store room count in dailyPlans
                if (!this.dailyPlanForm.dailyPlans[dayNumber]) {
                    this.dailyPlanForm.dailyPlans[dayNumber] = {}
                }
                this.dailyPlanForm.dailyPlans[dayNumber].roomCount = dayData.roomCount

                console.log(`Restored room count for day ${dayNumber}: ${dayData.roomCount}`)
            }
        }
    }

    restoreExtraBedCount(dayNumber, dayData) {
        if (dayData.extraBedCount) {
            const extraBedCountElement = document.querySelector(`#day-${dayNumber} .extra-bed-count`)
            if (extraBedCountElement) {
                extraBedCountElement.textContent = dayData.extraBedCount.toString().padStart(2, "0")

                // Store extra bed count in dailyPlans
                if (!this.dailyPlanForm.dailyPlans[dayNumber]) {
                    this.dailyPlanForm.dailyPlans[dayNumber] = {}
                }
                this.dailyPlanForm.dailyPlans[dayNumber].extraBedCount = dayData.extraBedCount

                console.log(`Restored extra bed count for day ${dayNumber}: ${dayData.extraBedCount}`)
            }
        }
    }

    async restoreSelectedTour(dayNumber, dayData) {
        if (dayData.selectedTour) {
            const selectedTourCard = document.querySelector(`#tourCards-${dayNumber} .tour-card[data-tour-id="${String(dayData.selectedTour)}"]`)
            if (selectedTourCard) {
                selectedTourCard.classList.add('selected')
                if (dayData.selectedTourData) {
                    // Store tour data without calling selectTour (which would trigger API calls)
                    this.dailyPlanForm.dailyPlans[dayNumber] = {
                        ...this.dailyPlanForm.dailyPlans[dayNumber],
                        selectedTour: String(dayData.selectedTour),
                        selectedTourData: dayData.selectedTourData
                    }

                    // Only preload vehicle if cache doesn't exist
                    if (!dayData.vehicleCache && dayData.selectedTourData.id) {
                        console.log(`Preloading vehicle data for day ${dayNumber} during restore`)
                        await this.dailyPlanForm.preloadVehicleData(dayNumber, dayData.selectedTourData.id)
                    } else {
                        console.log(`Vehicle cache exists for day ${dayNumber}, skipping API call`)

                        // If we have vehicle cache and itinerary selection, restore vehicle UI
                        if (dayData.vehicleCache && dayData.itinerary) {
                            console.log(`Restoring vehicle UI for day ${dayNumber}`)
                            const vehicleData = dayData.vehicleCache[dayData.itinerary]
                            if (vehicleData) {
                                const paxCount = this.dailyPlanForm.getCorrectPaxCount(dayNumber)
                                // Use stored calculated price if available
                                const storedPrice = dayData.vehicle?.calculatedPrice
                                this.dailyPlanForm.updateVehicleUI(dayNumber, vehicleData, paxCount, dayData.itinerary, null, storedPrice)
                            }
                        }
                    }
                }
            }
        }
    }

    restoreServiceCheckboxes(dayNumber, dayData) {
        if (dayData.services && dayData.services.length > 0) {
            dayData.services.forEach(service => {
                const checkbox = document.querySelector(`input[name="${service}-${dayNumber}"]`)
                if (checkbox) {
                    checkbox.checked = true
                }
            })

            // Store services in dailyPlans
            if (!this.dailyPlanForm.dailyPlans[dayNumber]) {
                this.dailyPlanForm.dailyPlans[dayNumber] = {}
            }
            this.dailyPlanForm.dailyPlans[dayNumber].services = dayData.services

            console.log(`Restored services for day ${dayNumber}:`, dayData.services)
        }
    }
}

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

        // Add pax type event listeners
        this.initPaxTypeControls()
    }

    initPaxTypeControls() {
        const paxTypeRadios = document.querySelectorAll('input[name="paxType"]')
        paxTypeRadios.forEach((radio) => {
            radio.addEventListener("change", (e) => {
                this.handlePaxTypeChange(e.target.value)
            })
        })

        // Set initial state
        const selectedPaxType = document.querySelector('input[name="paxType"]:checked')?.value
        if (selectedPaxType) {
            this.handlePaxTypeChange(selectedPaxType)
        }
    }

    handlePaxTypeChange(paxType) {
        const paxSection = document.querySelector(".pax-section .age-groups")

        if (paxType === "customize") {
            // Hide pax inputs in step 1
            if (paxSection) {
                paxSection.style.display = "none"
            }
            // Reset step 1 pax to 0 when customizing
            this.resetStep1Pax()
        } else {
            // Show pax inputs in step 1 for default mode
            if (paxSection) {
                paxSection.style.display = "grid"
            }
        }

        // Notify DailyPlanForm about pax mode change
        if (this.bookForm.dailyPlanForm) {
            this.bookForm.dailyPlanForm.notifyPaxModeChange(paxType)
        }

        this.updateTotalPax()
        this.updateSidebar()
    }

    resetStep1Pax() {
        const paxInputs = ['adults', 'children1', 'children2', 'children3']
        paxInputs.forEach(inputId => {
            const input = document.getElementById(inputId)
            const display = document.querySelector(`.quantity-number[data-target="${inputId}"]`)
            if (input) input.value = 0
            if (display) display.textContent = 0
        })
    }

    updateTotalPax() {
        const total = this.getTotalPaxCount().totalPax
        document.getElementById("totalPax").textContent = `${total} pax`
        return total
    }

    getTotalPaxCount() {
        const paxType = document.querySelector('input[name="paxType"]:checked')?.value

        if (paxType === "customize") {
            // In customize mode, return 0 for step 1 since each day has its own pax
            return {
                totalPax: 0,
                adults: 0,
                children: 0,
                // children1: 0,
                // children2: 0,
                // children3: 0
            }
        }

        // Default mode - use step 1 inputs
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
            children1,
            children2,
            children3
        }
    }

    // Get pax count for a specific day (used in customize mode)
    getDayPaxCount(dayNumber) {
        const paxType = document.querySelector('input[name="paxType"]:checked')?.value

        if (paxType === "customize") {
            // Get pax from day-specific inputs
            const adults = Number.parseInt(document.getElementById(`adults-${dayNumber}`)?.value) || 0
            const children1 = Number.parseInt(document.getElementById(`children1-${dayNumber}`)?.value) || 0
            const children2 = Number.parseInt(document.getElementById(`children2-${dayNumber}`)?.value) || 0
            const children3 = Number.parseInt(document.getElementById(`children3-${dayNumber}`)?.value) || 0

            const childrenTotal = children1 + children2 + children3
            const totalPax = adults + childrenTotal
            return {
                totalPax,
                adults,
                children: childrenTotal,
                children1,
                children2,
                children3
            }
        } else {
            // Default mode - use step 1 inputs
            return this.getTotalPaxCount()
        }
    }

    // Check if we're in customize mode
    isCustomizeMode() {
        return document.querySelector('input[name="paxType"]:checked')?.value === "customize"
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

        // Validate pax count based on mode
        if (!this.isCustomizeMode()) {
            // Default mode - validate step 1 pax
            const totalPax = this.getTotalPaxCount().totalPax
            if (totalPax < 1) {
                this.showFieldError("totalPax", "At least 1 passenger is required")
                errors.push("At least 1 passenger is required")
                isValid = false
            }
        }
        // For customize mode, pax validation will be done in step 2 for each day

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

// Daily Plan Form (Step 2) - Now using specialized managers
class DailyPlanForm {
    constructor(bookingForm) {
        this.bookingForm = bookingForm
        this.dailyPlans = {}
        this.grandTotal = 0  // Total price for all confirmed days
        this.currentPaxMode = null  // Track current pax mode to detect changes
        this.lastGeneratedMode = null  // Track mode from last generateDailyPlans call

        // Initialize specialized managers
        this.regionCityManager = new RegionCityManager()
        this.tourManager = new TourManager()
        this.vehicleManager = new VehicleManager()
        this.guideManager = new GuideManager()
        this.hotelManager = new HotelManager()
        this.serviceManager = new ServiceManager()
        this.priceCalculator = new PriceCalculator(bookingForm)
        this.formStateManager = new FormStateManager(this)

        // Legacy properties for backward compatibility
        this.regions = this.regionCityManager.regions
        this.currentCities = this.regionCityManager.currentCities
        this.guideOptions = this.guideManager.guideOptions

        // Tours cache to prevent duplicate API calls
        this.toursCache = {} // key: "destination-tourType", value: tours array

        // Set initial pax mode
        if (this.bookingForm.tourInfoForm) {
            this.currentPaxMode = this.bookingForm.tourInfoForm.isCustomizeMode() ? 'customize' : 'default'
            console.log(`DailyPlanForm initialized with pax mode: ${this.currentPaxMode}`)
        }

        this.init()
    }

    init() {
        // Managers are initialized in constructor
        // No additional initialization needed
    }

    // Delegate to TourManager
    getTourTypeLabel(tourTypeValue) {
        return this.tourManager.getTourTypeLabel(tourTypeValue)
    }

    // Delegate to RegionCityManager
    async fetchDestinationChildren(slug) {
        return await this.regionCityManager.fetchDestinationChildren(slug)
    }

    // Delegate to RegionCityManager
    async loadCitiesForRegion(regionSlug, dayNumber) {
        return await this.regionCityManager.loadCitiesForRegion(regionSlug)
    }

    generateDailyPlans() {
        const tourInfo = this.bookingForm.tourInfoForm.getFormData()
        const days = tourInfo.days
        const container = document.getElementById("dailyPlanContainer")

        // Check if pax mode has changed since last generateDailyPlans call
        const currentMode = this.bookingForm.tourInfoForm.isCustomizeMode() ? 'customize' : 'default'
        const modeChanged = this.lastGeneratedMode && this.lastGeneratedMode !== currentMode

        if (modeChanged) {
            console.log(`Pax mode changed from ${this.lastGeneratedMode} to ${currentMode} - clearing all data`)
            this.clearAllDailyPlansData()
        }

        // Update last generated mode
        this.lastGeneratedMode = currentMode

        container.innerHTML = ""

        for (let i = 1; i <= days; i++) {
            const dayElement = this.createDayElement(i, tourInfo.startDate)
            container.appendChild(dayElement)
        }

        // Only restore form state if mode hasn't changed
        if (!modeChanged) {
            console.log(`No mode change detected (${currentMode}) - restoring form state`)
            this.restoreFormState()
        } else {
            console.log('Mode changed - skipping form state restoration')
        }

        // Note: Cities are now loaded automatically during restore process in FormStateManager

        // Fix: Gọi API city cho region đang được checked ngay sau khi render step 2
        for (let i = 1; i <= days; i++) {
            const checkedRegion = document.querySelector(`input[name="location-${i}"]:checked`)
            if (checkedRegion) {
                this.updateCityOptions(i, checkedRegion.value)
            }
        }
    }

    // Restore form state from saved dailyPlans data using FormStateManager
    restoreFormState() {
        this.formStateManager.restoreFormState(this.dailyPlans)
    }

    // Clear all daily plans data when pax mode changes
    clearAllDailyPlansData() {
        this.dailyPlans = {}
        this.grandTotal = 0
        this.toursCache = {}

        // Clear all form inputs in step 2 if container exists
        const container = document.getElementById("dailyPlanContainer")
        if (container) {
            // Clear all radio buttons
            container.querySelectorAll('input[type="radio"]:checked').forEach(radio => {
                radio.checked = false
            })

            // Clear all text inputs
            container.querySelectorAll('input[type="text"]').forEach(input => {
                input.value = ''
                input.removeAttribute('data-value')
            })

            // Clear all checkboxes
            container.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
                checkbox.checked = false
            })

            // Reset room counts and other counters
            container.querySelectorAll('.room-count, .extra-bed-count').forEach(counter => {
                counter.textContent = '01'
            })

            // Clear tour cards selections
            container.querySelectorAll('.tour-card.selected').forEach(card => {
                card.classList.remove('selected')
            })

            // Clear tour cards container content
            container.querySelectorAll('[id^="tourCards-"]').forEach(tourContainer => {
                tourContainer.innerHTML = ''
            })

            // Clear vehicle displays and price displays
            container.querySelectorAll('.total-price-day').forEach(priceDisplay => {
                priceDisplay.innerHTML = ''
            })

            // Hide all progressive sections
            container.querySelectorAll('.progressive-section').forEach(section => {
                section.style.display = 'none'
                section.classList.remove('section-visible')
            })

            // Reset collapsed and expanded states
            container.querySelectorAll('.day-content').forEach(dayContent => {
                dayContent.style.display = 'block'
            })

            container.querySelectorAll('.day-collapsed').forEach(dayCollapsed => {
                dayCollapsed.style.display = 'none'
            })
        }

        // Clear and reset sidebar to initial state
        this.resetSidebarToInitialState()

        console.log('All daily plans data cleared due to pax mode change')
    }

    // Reset sidebar to initial state
    resetSidebarToInitialState() {
        // Force sidebar update with current tour info
        if (this.bookingForm.tourInfoForm) {
            this.bookingForm.tourInfoForm.updateSidebar()
        }
    }

    // Notify about pax mode change from TourInformationForm
    notifyPaxModeChange(newPaxType) {
        const newMode = newPaxType === 'customize' ? 'customize' : 'default'

        // If mode is changing and we have existing data, mark for clearing
        if (this.currentPaxMode && this.currentPaxMode !== newMode) {
            console.log(`Pax mode will change from ${this.currentPaxMode} to ${newMode} - data will be cleared on next step 2 visit`)
            // Don't clear immediately - let generateDailyPlans handle it when user goes to step 2
        } else if (!this.currentPaxMode) {
            console.log(`Initial pax mode set to: ${newMode}`)
        }

        // Always update the current mode
        this.currentPaxMode = newMode
    }

    // Restore form state for a specific day (used when expanding confirmed days)
    restoreFormStateForDay(dayNumber) {
        const dayData = this.dailyPlans[dayNumber]
        if (!dayData) return

        console.log(`Restoring form state for day ${dayNumber}:`, dayData)

        // Ensure dailyPlans has all data before restore (in case it got reset)
        this.dailyPlans[dayNumber] = { ...dayData }

        // Use FormStateManager to restore this specific day
        this.formStateManager.restoreDaySelections(dayNumber, dayData)

        // Also restore room count and extra bed count immediately (no delay needed)
        if (dayData.roomCount) {
            const roomCountElement = document.getElementById(`roomCount-${dayNumber}`)
            if (roomCountElement) {
                roomCountElement.textContent = dayData.roomCount.toString().padStart(2, "0")
            }
        }

        if (dayData.extraBedCount) {
            const extraBedCountElement = document.getElementById(`extraBedCount-${dayNumber}`)
            if (extraBedCountElement) {
                extraBedCountElement.textContent = dayData.extraBedCount.toString().padStart(2, "0")
            }
        }

        // Restore vehicle state and update total price after all other restorations
        setTimeout(() => {
            // Update total price display
            if (dayData.totalPrice) {
                this.priceCalculator.updateDayTotalPriceDisplay(dayNumber, dayData.totalPrice, {
                    vehicle: dayData.vehicle?.calculatedPrice || 0,
                    food: 0, // Will be calculated
                    hotel: 0, // Will be calculated
                    extraBed: dayData.extraBedCount ? dayData.extraBedCount * 10 : 0,
                    tour: 0 // Tour price included in vehicle
                })
            }

            // Recalculate total price to ensure accuracy
            this.calculateDayTotalPrice(dayNumber)

            console.log(`Form state fully restored for day ${dayNumber}`)
        }, 1300) // After all restore delays are done
    }

    // Note: Auto-load cities functionality moved to FormStateManager.restoreDaySelections



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

        // Add pax section for customize mode
        this.handlePaxSectionForDay(dayElement, dayNumber)

        // Hide progressive sections initially
        this.hideProgressiveSections(dayElement)
    }

    // Add pax section to day if in customize mode
    handlePaxSectionForDay(dayElement, dayNumber) {
        const isCustomizeMode = this.bookingForm.tourInfoForm.isCustomizeMode()

        if (isCustomizeMode) {
            // Find insertion point (after location section)
            const locationSection = dayElement.querySelector('.location-section')
            if (locationSection) {
                const paxSection = this.createPaxSectionForDay(dayNumber)
                locationSection.insertAdjacentHTML('afterend', paxSection)
            }
        }
    }

    // Create pax section HTML for a specific day
    createPaxSectionForDay(dayNumber) {
        return `
            <div class="form-group pax-section-day" id="paxSection-${dayNumber}">
                <h3>Passenger Information - Day ${dayNumber}</h3>
                <div class="pax-controls-day">
                    <div class="pax-item">
                        <label>Adults (13+ years)</label>
                        <div class="quantity-control">
                            <button type="button" class="qty-btn minus" data-target="adults-${dayNumber}">-</button>
                            <span class="quantity-number" data-target="adults-${dayNumber}">2</span>
                            <button type="button" class="qty-btn plus" data-target="adults-${dayNumber}">+</button>
                        </div>
                        <input type="hidden" id="adults-${dayNumber}" value="2">
                    </div>
                    <div class="pax-item">
                        <label>Children (0-2 years) - Free</label>
                        <div class="quantity-control">
                            <button type="button" class="qty-btn minus" data-target="children1-${dayNumber}">-</button>
                            <span class="quantity-number" data-target="children1-${dayNumber}">0</span>
                            <button type="button" class="qty-btn plus" data-target="children1-${dayNumber}">+</button>
                        </div>
                        <input type="hidden" id="children1-${dayNumber}" value="0">
                    </div>
                    <div class="pax-item">
                        <label>Children (3-6 years) - 60%</label>
                        <div class="quantity-control">
                            <button type="button" class="qty-btn minus" data-target="children2-${dayNumber}">-</button>
                            <span class="quantity-number" data-target="children2-${dayNumber}">0</span>
                            <button type="button" class="qty-btn plus" data-target="children2-${dayNumber}">+</button>
                        </div>
                        <input type="hidden" id="children2-${dayNumber}" value="0">
                    </div>
                    <div class="pax-item">
                        <label>Children (7-12 years) - 80%</label>
                        <div class="quantity-control">
                            <button type="button" class="qty-btn minus" data-target="children3-${dayNumber}">-</button>
                            <span class="quantity-number" data-target="children3-${dayNumber}">0</span>
                            <button type="button" class="qty-btn plus" data-target="children3-${dayNumber}">+</button>
                        </div>
                        <input type="hidden" id="children3-${dayNumber}" value="0">
                    </div>
                </div>
                <div class="total-pax-day">
                    Total: <span id="totalPax-${dayNumber}">2 pax</span>
                </div>
            </div>
        `
    }

    // Hide sections that should be shown progressively
    hideProgressiveSections(dayElement) {
        const sectionsToHide = [
            '.itinerary-section',
            '.vehicle-section',
            '.guide-section',
            '.food-section',
            '.hotel-section',
            '.services-section'
        ]

        sectionsToHide.forEach(selector => {
            const section = dayElement.querySelector(selector)
            if (section) {
                section.style.display = 'none'
                section.classList.add('progressive-section')
            }
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
            { selector: ".city-section", id: `citySection-${dayNumber}` },
            { selector: ".guide-search", id: `guide-${dayNumber}`, name: `guide-${dayNumber}` },
            { selector: ".guide-dropdown", id: `guideDropdown-${dayNumber}` },
            { selector: ".itinerary-radio", name: `itinerary-${dayNumber}` },
            { selector: ".food-radio", name: `food-${dayNumber}` }
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

        // Set itinerary radio button names
        dayElement.querySelectorAll(".itinerary-radio").forEach(radio => {
            radio.name = `itinerary-${dayNumber}`
        })

        // Set food radio button names
        dayElement.querySelectorAll(".food-radio").forEach(radio => {
            radio.name = `food-${dayNumber}`
        })

        // Set hotel radio button names
        dayElement.querySelectorAll(".hotel-radio").forEach(radio => {
            radio.name = `hotel-${dayNumber}`
        })

        // Set extra bed radio button names
        dayElement.querySelectorAll(".extra-bed-radio").forEach(radio => {
            radio.name = `extra-bed-${dayNumber}`
        })

        // Set extra bed elements IDs
        const extraBedInputGroup = dayElement.querySelector(".extra-bed-input-group")
        if (extraBedInputGroup) {
            extraBedInputGroup.id = `extraBedInputGroup-${dayNumber}`
        }

        const extraBedCount = dayElement.querySelector(".extra-bed-count")
        if (extraBedCount) {
            extraBedCount.id = `extraBedCount-${dayNumber}`
        }

        const extraBedError = dayElement.querySelector(".extra-bed-error")
        if (extraBedError) {
            extraBedError.id = `extraBedError-${dayNumber}`
        }

        // Set room control data-day attributes
        dayElement.querySelectorAll(".room-btn").forEach(btn => {
            btn.setAttribute("data-day", dayNumber)
        })

        // Set extra bed control data-day attributes
        dayElement.querySelectorAll(".extra-bed-btn").forEach(btn => {
            btn.setAttribute("data-day", dayNumber)
        })

        // Set action button data-day attributes
        dayElement.querySelectorAll(".confirm-day-btn, .see-detail-btn").forEach(btn => {
            btn.setAttribute("data-day", dayNumber)
        })

        // Set total-price-day ID for this day
        const totalPriceDay = dayElement.querySelector(".total-price-day")
        if (totalPriceDay) {
            totalPriceDay.id = `totalPriceDay-${dayNumber}`
        }

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

        // Guide search - Updated to show all on focus and search on input
        const guideSearch = dayElement
            ? dayElement.querySelector(`#guide-${dayNumber}`)
            : document.getElementById(`guide-${dayNumber}`)

        if (guideSearch) {
            guideSearch.addEventListener("focus", (e) => {
                this.showAllGuides(dayNumber)
            })
            guideSearch.addEventListener("blur", (e) => {
                // Check if blur is caused by clicking inside dropdown
                setTimeout(() => {
                    const dropdown = document.getElementById(`guideDropdown-${dayNumber}`)
                    const activeElement = document.activeElement

                    // Don't close if focus is on dropdown search input or dropdown contains active element
                    if (dropdown &&
                        !dropdown.contains(activeElement) &&
                        !activeElement?.classList.contains('dropdown-search-input')) {
                        dropdown.style.display = "none"
                    }
                }, 150)
            })
        }

        // Handle dropdown interactions
        setTimeout(() => {
            const dropdown = document.getElementById(`guideDropdown-${dayNumber}`)
            const dropdownSearchInput = dropdown?.querySelector('.dropdown-search-input')

            if (dropdown) {
                // Prevent dropdown from closing when clicking inside (except search input)
                dropdown.addEventListener("mousedown", (e) => {
                    // Only prevent default if not clicking on search input
                    if (!e.target.classList.contains('dropdown-search-input')) {
                        e.preventDefault()
                    }
                })

                dropdown.addEventListener("click", (e) => {
                    e.stopPropagation()
                })

                // Handle clicks outside to close dropdown
                document.addEventListener("click", (e) => {
                    if (!dropdown.contains(e.target) && !guideSearch?.contains(e.target)) {
                        dropdown.style.display = "none"
                    }
                })
            }

            if (dropdownSearchInput) {
                dropdownSearchInput.addEventListener("input", (e) => {
                    this.searchGuides(dayNumber, e.target.value)
                })

                dropdownSearchInput.addEventListener("mousedown", (e) => {
                    e.stopPropagation()
                })

                dropdownSearchInput.addEventListener("click", (e) => {
                    e.stopPropagation()
                    dropdownSearchInput.focus() // Ensure focus
                })

                dropdownSearchInput.addEventListener("focus", (e) => {
                    e.stopPropagation()
                })
            }
        }, 100)

        // Itinerary selection
        const itineraryRadios = dayElement
            ? dayElement.querySelectorAll(`input[name="itinerary-${dayNumber}"]`)
            : document.querySelectorAll(`input[name="itinerary-${dayNumber}"]`)
        itineraryRadios.forEach((radio) => {
            radio.addEventListener("change", () => {
                this.updateItinerarySelection(dayNumber, radio.value)
            })
        })

        // Food selection
        const foodRadios = dayElement
            ? dayElement.querySelectorAll(`.food-radio`)
            : document.querySelectorAll(`#day-${dayNumber} .food-radio`)
        foodRadios.forEach((radio) => {
            radio.addEventListener("change", () => {
                this.updateFoodSelection(dayNumber, radio.value)
            })
        })

        // Hotel selection
        const hotelRadios = dayElement
            ? dayElement.querySelectorAll(`.hotel-radio`)
            : document.querySelectorAll(`#day-${dayNumber} .hotel-radio`)
        hotelRadios.forEach((radio) => {
            radio.addEventListener("change", () => {
                this.updateHotelSelection(dayNumber, radio.value)
            })
        })

        // Extra bed selection
        const extraBedRadios = dayElement
            ? dayElement.querySelectorAll(`.extra-bed-radio`)
            : document.querySelectorAll(`#day-${dayNumber} .extra-bed-radio`)
        extraBedRadios.forEach((radio) => {
            radio.addEventListener("change", () => {
                this.updateExtraBedSelection(dayNumber, radio.value)
            })
        })

        // Extra bed controls
        const extraBedMinusBtn = dayElement
            ? dayElement.querySelector(`.extra-bed-btn.minus`)
            : document.querySelector(`#day-${dayNumber} .extra-bed-btn.minus`)
        const extraBedPlusBtn = dayElement
            ? dayElement.querySelector(`.extra-bed-btn.plus`)
            : document.querySelector(`#day-${dayNumber} .extra-bed-btn.plus`)

        if (extraBedMinusBtn) extraBedMinusBtn.addEventListener("click", () => this.updateExtraBedCount(dayNumber, -1))
        if (extraBedPlusBtn) extraBedPlusBtn.addEventListener("click", () => this.updateExtraBedCount(dayNumber, 1))

        // Day-specific pax controls (for customize mode)
        this.initDayPaxControls(dayNumber, dayElement)

        // Confirm day button
        const confirmBtn = dayElement
            ? dayElement.querySelector(`.confirm-day-btn[data-day="${dayNumber}"]`)
            : document.querySelector(`.confirm-day-btn[data-day="${dayNumber}"]`)

        if (confirmBtn) {
            confirmBtn.addEventListener("click", (e) => {
                e.preventDefault() // Prevent form submission
                e.stopPropagation() // Stop event bubbling
                this.confirmDay(dayNumber)
            })
        }

        // See detail button (will be added after collapse)
        setTimeout(() => {
            const seeDetailBtn = document.querySelector(`.see-detail-btn[data-day="${dayNumber}"]`)
            if (seeDetailBtn) {
                seeDetailBtn.addEventListener("click", (e) => {
                    e.preventDefault() // Prevent form submission
                    e.stopPropagation() // Stop event bubbling
                    this.expandDay(dayNumber)
                })
            }
        }, 100)
    }

    // Initialize pax controls for a specific day (customize mode)
    initDayPaxControls(dayNumber, dayElement) {
        const paxButtons = dayElement
            ? dayElement.querySelectorAll(`[data-target^="adults-${dayNumber}"], [data-target^="children1-${dayNumber}"], [data-target^="children2-${dayNumber}"], [data-target^="children3-${dayNumber}"]`)
            : document.querySelectorAll(`[data-target^="adults-${dayNumber}"], [data-target^="children1-${dayNumber}"], [data-target^="children2-${dayNumber}"], [data-target^="children3-${dayNumber}"]`)

        paxButtons.forEach((button) => {
            button.addEventListener("click", (e) => {
                e.preventDefault()
                const target = button.dataset.target
                const input = document.getElementById(target)
                const isPlus = button.classList.contains("plus")
                const currentValue = Number.parseInt(input.value) || 0
                const currentQtyDisplay = document.querySelector(`.quantity-number[data-target="${target}"]`)

                if (isPlus) {
                    input.value = currentValue + 1
                    currentQtyDisplay.textContent = currentValue + 1
                } else if (currentValue > 0) {
                    input.value = currentValue - 1
                    currentQtyDisplay.textContent = currentValue - 1
                }

                this.updateDayTotalPax(dayNumber)

                // Preload vehicle data if tour is selected
                if (this.dailyPlans[dayNumber]?.selectedTourData?.id) {
                    this.preloadVehicleData(dayNumber, this.dailyPlans[dayNumber].selectedTourData.id)
                        .then(() => {
                            // Update vehicle UI if itinerary is already selected
                            if (this.dailyPlans[dayNumber]?.itinerary) {
                                this.handleCheckVehicle(dayNumber, this.dailyPlans[dayNumber].itinerary)
                            }
                        })
                }
            })
        })
    }

    // Update total pax display for a specific day
    updateDayTotalPax(dayNumber) {
        const dayPaxData = this.bookingForm.tourInfoForm.getDayPaxCount(dayNumber)
        const totalPaxElement = document.getElementById(`totalPax-${dayNumber}`)
        if (totalPaxElement) {
            totalPaxElement.textContent = `${dayPaxData.totalPax} pax`
        }
        return dayPaxData.totalPax

        // Initialize dropdowns after element is appended to DOM
        setTimeout(() => {
            // Set default region to north
            const firstRadio = document.querySelector(`input[name="location-${dayNumber}"]`)
            if (firstRadio) {
                firstRadio.checked = true
                this.updateCityOptions(dayNumber, firstRadio.value)
            }
            this.initTourTypeSearch(dayNumber)
            this.initGuideDropdown(dayNumber)

            // Set default itinerary to standard and load vehicle
            const standardRadio = document.querySelector(`input[name="itinerary-${dayNumber}"][value="standard"]`)
            if (standardRadio) {
                standardRadio.checked = true
                // Load default vehicle (standard) on initialization
                this.handleCheckVehicle(dayNumber, 'standard')
            }

            // Note: Removed default selections to allow progressive disclosure
            // Sections will be shown only after user completes basic selections
        }, 50)
    }

    toggleNoService(dayNumber, isNoService) {
        const dayContent = document.getElementById(`dayContent-${dayNumber}`)
        const dayCollapsed = document.getElementById(`dayCollapsed-${dayNumber}`)

        if (isNoService) {
            dayContent.style.display = "none"
            dayCollapsed.style.display = "block"

            // Update collapsed content for no service
            const collapsedContent = dayCollapsed.querySelector(".collapsed-content")
            collapsedContent.innerHTML = `
                <h4>Day ${dayNumber}: No use service for this day</h4>
                <div class="no-service-indicator">
                    <span class="free-day-badge">Free Day</span>
                </div>
            `

            // Store no service data
            this.dailyPlans[dayNumber] = {
                noService: true,
                confirmed: true
            }

            // Update sidebar to show free day
            this.updateSidebarForFreeDay(dayNumber)
        } else {
            dayContent.style.display = "block"
            dayCollapsed.style.display = "none"

            // Clear no service data
            if (this.dailyPlans[dayNumber]) {
                delete this.dailyPlans[dayNumber].noService
                delete this.dailyPlans[dayNumber].confirmed
            }
        }

        // Recalculate grand total when toggling no service
        this.calculateGrandTotal()
    }

    async updateCityOptions(dayNumber, region) {
        const citySection = document.getElementById(`citySection-${dayNumber}`)
        const citySearch = document.getElementById(`city-${dayNumber}`)
        const dropdown = document.getElementById(`cityDropdown-${dayNumber}`)

        // Initialize dailyPlans for this day if not exists
        if (!this.dailyPlans[dayNumber]) {
            this.dailyPlans[dayNumber] = {}
        }

        // Store location selection
        this.dailyPlans[dayNumber].location = region

        // Handle Phu Quoc special case - hide city selection
        if (region === 'phu-quoc-island') {
            if (citySection) citySection.style.display = 'none'
            if (citySearch) {
                citySearch.value = 'Phu Quoc Island'
                citySearch.dataset.value = 'phu-quoc-island'

                // Store city data for Phu Quoc
                this.dailyPlans[dayNumber].city = 'Phu Quoc Island'
                this.dailyPlans[dayNumber].cityValue = 'phu-quoc-island'
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

                // Store city selection immediately
                this.dailyPlans[dayNumber].city = city.label
                this.dailyPlans[dayNumber].cityValue = city.value

                const tourTypeSearch = document.getElementById(`tourType-${dayNumber}`)
                if (tourTypeSearch && tourTypeSearch.dataset.value) {
                    this.loadTours(dayNumber, city.value, tourTypeSearch.dataset.value)
                        .then(tours => {
                            // Store tours data for caching
                            this.dailyPlans[dayNumber].toursData = tours
                        })
                }

                // Check and show progressive sections
                this.checkAndShowProgressiveSections(dayNumber)
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

        const cities = this.currentCities[selectedRegion] || []

        dropdown.innerHTML = ""
        dropdown.style.display = "block"

        cities.forEach((city) => {
            const option = document.createElement("div")
            option.className = "dropdown-option"
            option.textContent = city.label
            option.addEventListener("click", () => {
                const citySearch = document.getElementById(`city-${dayNumber}`)
                citySearch.value = city.label
                citySearch.dataset.value = city.value
                dropdown.style.display = "none"

                // Store city selection immediately
                if (!this.dailyPlans[dayNumber]) {
                    this.dailyPlans[dayNumber] = {}
                }
                this.dailyPlans[dayNumber].city = city.label
                this.dailyPlans[dayNumber].cityValue = city.value

                const tourTypeSearch = document.getElementById(`tourType-${dayNumber}`)
                if (tourTypeSearch && tourTypeSearch.dataset.value) {
                    this.loadTours(dayNumber, city.value, tourTypeSearch.dataset.value)
                }

                // Check and show progressive sections
                this.checkAndShowProgressiveSections(dayNumber)
            })
            dropdown.appendChild(option)
        })
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

                // Store city selection immediately
                if (!this.dailyPlans[dayNumber]) {
                    this.dailyPlans[dayNumber] = {}
                }
                this.dailyPlans[dayNumber].city = city.label
                this.dailyPlans[dayNumber].cityValue = city.value

                const tourTypeSearch = document.getElementById(`tourType-${dayNumber}`)
                if (tourTypeSearch && tourTypeSearch.dataset.value) {
                    this.loadTours(dayNumber, city.value, tourTypeSearch.dataset.value)
                }

                // Check and show progressive sections
                this.checkAndShowProgressiveSections(dayNumber)
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

        // Get template and clone options from it
        const template = document.getElementById("daily-plan-template")
        if (!template) return

        const templateOptions = template.content.querySelectorAll(".tour-type-dropdown .dropdown-option")
        templateOptions.forEach((templateOption) => {
            const option = templateOption.cloneNode(true)
            option.addEventListener("click", () => {
                const tourTypeSearch = document.getElementById(`tourType-${dayNumber}`)
                const value = option.getAttribute("data-value")
                const label = option.textContent.trim()

                tourTypeSearch.value = label
                tourTypeSearch.dataset.value = value
                dropdown.style.display = "none"

                // Store tour type selection immediately
                if (!this.dailyPlans[dayNumber]) {
                    this.dailyPlans[dayNumber] = {}
                }
                this.dailyPlans[dayNumber].tourType = label
                this.dailyPlans[dayNumber].tourTypeValue = value

                const citySearch = document.getElementById(`city-${dayNumber}`)
                if (citySearch && citySearch.dataset.value) {
                    this.loadTours(dayNumber, citySearch.dataset.value, value)
                        .then(tours => {
                            // Store tours data for caching
                            this.dailyPlans[dayNumber].toursData = tours
                        })
                }

                // Check and show progressive sections
                this.checkAndShowProgressiveSections(dayNumber)
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
        const dropdown = document.getElementById(`tourTypeDropdown-${dayNumber}`)
        if (!dropdown) return

        dropdown.innerHTML = ""

        // Get template and filter options from it
        const template = document.getElementById("daily-plan-template")
        if (!template) return

        const templateOptions = template.content.querySelectorAll(".tour-type-dropdown .dropdown-option")
        const filteredOptions = Array.from(templateOptions).filter(option =>
            option.textContent.trim().toLowerCase().includes(query.toLowerCase())
        )

        dropdown.style.display = filteredOptions.length > 0 ? "block" : "none"

        filteredOptions.forEach((templateOption) => {
            const option = templateOption.cloneNode(true)
            option.addEventListener("click", () => {
                const tourTypeSearch = document.getElementById(`tourType-${dayNumber}`)
                const value = option.getAttribute("data-value")
                const label = option.textContent.trim()

                tourTypeSearch.value = label
                tourTypeSearch.dataset.value = value
                dropdown.style.display = "none"

                // Store tour type selection immediately
                if (!this.dailyPlans[dayNumber]) {
                    this.dailyPlans[dayNumber] = {}
                }
                this.dailyPlans[dayNumber].tourType = label
                this.dailyPlans[dayNumber].tourTypeValue = value

                const citySearch = document.getElementById(`city-${dayNumber}`)
                if (citySearch && citySearch.dataset.value) {
                    this.loadTours(dayNumber, citySearch.dataset.value, value)
                        .then(tours => {
                            // Store tours data for caching
                            this.dailyPlans[dayNumber].toursData = tours
                        })
                }

                // Check and show progressive sections
                this.checkAndShowProgressiveSections(dayNumber)
            })
            dropdown.appendChild(option)
        })
    }

    async loadTours(dayNumber, destination, tourType) {
        if (!destination || !tourType) return []

        const tourCards = document.getElementById(`tourCards-${dayNumber}`)
        tourCards.innerHTML = '<div class="loading">Loading tours...</div>'

        try {
            // Use the actual API to fetch tours
            const tours = await this.fetchToursFromAPI(destination, tourType)
            this.renderTours(dayNumber, tours)
            return tours
        } catch (error) {
            console.error("Error loading tours:", error)
            tourCards.innerHTML = '<div class="error">Error loading tours. Please try again.</div>'
            return []
        }
    }

    async fetchToursFromAPI(destination, tourType) {
        // Create cache key
        const cacheKey = `${destination}-${tourType}`

        // Check cache first
        if (this.toursCache[cacheKey]) {
            console.log(`Using cached tours for ${cacheKey}:`, this.toursCache[cacheKey])
            return this.toursCache[cacheKey]
        }

        try {
            console.log('Fetching tours from API for:', { destination, tourType })
            const response = await fetch(`https://lotus.okhub-tech.com/wp-json/api/v1/tours-by-tax?destination=${destination}&tour_type=${tourType}`)

            if (!response.ok) {
                throw new Error(`API response not ok: ${response.status}`)
            }

            const data = await response.json()
            console.log('Raw API response:', data)

            if (!Array.isArray(data)) {
                console.error('API response is not an array:', data)
                return []
            }

            // Transform API data to expected format
            const transformedTours = data.map((tour, index) => {
                console.log(`Tour ${index}:`, tour)

                // Handle different possible ID field names and ensure it's a string
                const tourId = String(tour.id || tour.ID || tour.post_id || `tour-${index}-${Date.now()}`)

                return {
                    id: tourId,
                    name: tour.title || tour.post_title || `Tour ${index + 1}`,
                    description: `Explore ${tour.title || tour.post_title || 'this destination'} with professional guidance`,
                    image: tour.featured_image || tour.image || "/placeholder.svg?height=150&width=200",
                    type: "Guided Tour",
                    services: tour.services || ["Professional guide", "Transportation", "Entrance fees"],
                    price: tour.price || Math.floor(Math.random() * 400) + 200,
                    duration: tour.duration || "Full day",
                    rating: tour.rating || 4.5,
                    link: tour.link || tour.permalink || '#'
                }
            })

            console.log('Transformed tours:', transformedTours)

            // Cache the result
            this.toursCache[cacheKey] = transformedTours

            return transformedTours

        } catch (error) {
            console.error('Error fetching tours from API:', error)
            console.log('Falling back to mock data')

            // Fallback to mock data if API fails
            const mockTours = this.generateMockTours(destination, tourType)

            // Cache mock data too
            this.toursCache[cacheKey] = mockTours

            return mockTours
        }
    }

    generateMockTours(destination, tourType) {
        const mockTours = [
            {
                id: String(`mock-tour-1-${Date.now()}`),
                name: `${destination} ${tourType} - Half Day`,
                description: `Discover the highlights of ${destination} with our expertly guided tour`,
                image: "/placeholder.svg?height=150&width=200",
                type: "Group Tour",
                services: ["Professional guide", "Transportation", "Entrance fees"],
                price: Math.floor(Math.random() * 200) + 150,
                duration: "4-5 hours",
                rating: 4.5,
                link: '#'
            },
            {
                id: String(`mock-tour-2-${Date.now()}`),
                name: `${destination} ${tourType} - Full Day`,
                description: `Complete tour experience in ${destination} with lunch included`,
                image: "/placeholder.svg?height=150&width=200",
                type: "Private Tour",
                services: ["Private guide", "Luxury transport", "Lunch", "Hotel pickup"],
                price: Math.floor(Math.random() * 400) + 300,
                duration: "8-9 hours",
                rating: 4.8,
                link: '#'
            }
        ]

        console.log('Generated mock tours:', mockTours)
        return mockTours
    }

    async fetchVehicle(pax, type, tourId) {
        // Check if tour ID is provided
        if (!tourId) {
            console.warn(`No tour ID provided, cannot fetch vehicle`)
            return null
        }

        console.log(`Fetching vehicle: pax=${pax}, type=${type}, tourId=${tourId}`)

        // Delegate to VehicleManager
        const vehicleData = await this.vehicleManager.fetchVehicle(pax, type, tourId)
        console.log(`Vehicle data received:`, vehicleData)

        return vehicleData
    }

    async handleCheckVehicle(dayNumber, vehicleType) {
        try {
            // Get correct pax count based on mode
            const paxData = this.getCorrectPaxCount(dayNumber)
            const totalPax = paxData.totalPax

            // Skip if no pax selected
            if (totalPax === 0) {
                console.log(`Day ${dayNumber} vehicle fetch skipped - no pax selected`)
                return
            }

            // Check if we have cached vehicle data
            const cachedVehicleData = this.dailyPlans[dayNumber]?.vehicleCache

            if (cachedVehicleData && cachedVehicleData[vehicleType]) {
                // Use cached data - no API call needed
                console.log(`Day ${dayNumber} using cached vehicle data for ${vehicleType}`)

                const vehicleData = cachedVehicleData[vehicleType].data
                const calculatedPrice = cachedVehicleData[vehicleType].calculatedPrice

                // Check if cached data is valid
                if (!vehicleData) {
                    console.error(`Day ${dayNumber}: Cached vehicle data for ${vehicleType} is null`)
                    return
                }

                // Update vehicle information in UI
                this.updateVehicleUI(dayNumber, vehicleData, totalPax, vehicleType, paxData, calculatedPrice)

                // Store current vehicle selection in daily plans
                this.dailyPlans[dayNumber] = {
                    ...this.dailyPlans[dayNumber],
                    vehicle: {
                        type: vehicleType,
                        data: vehicleData,
                        pax: totalPax,
                        paxData: paxData,
                        calculatedPrice: calculatedPrice
                    }
                }

                console.log(`Day ${dayNumber} vehicle updated from cache:`, vehicleType, `${totalPax} pax`)

                // Calculate day total price
                this.calculateDayTotalPrice(dayNumber)
                return
            }

            // Fallback: No cache available, fetch from API
            console.log(`Day ${dayNumber} no cache available, fetching vehicle from API...`)

            // Show loading state
            const vehicleSection = document.querySelector(`#day-${dayNumber} .vehicle-section`)
            if (vehicleSection) {
                vehicleSection.style.opacity = '0.6'
            }

            // Fetch vehicle data from API
            const tourId = this.dailyPlans[dayNumber]?.selectedTourData?.id

            if (!tourId) {
                console.error(`Day ${dayNumber}: No tour ID available for vehicle fetch`)
                return
            }

            const vehicleData = await this.fetchVehicle(totalPax, vehicleType, tourId)

            if (vehicleData) {
                const calculatedPrice = this.calculateVehiclePrice(vehicleData, totalPax, paxData)

                // Update vehicle information in UI
                this.updateVehicleUI(dayNumber, vehicleData, totalPax, vehicleType, paxData, calculatedPrice)

                // Store vehicle data in daily plans
                this.dailyPlans[dayNumber] = {
                    ...this.dailyPlans[dayNumber],
                    vehicle: {
                        type: vehicleType,
                        data: vehicleData,
                        pax: totalPax,
                        paxData: paxData,
                        calculatedPrice: calculatedPrice
                    }
                }

                console.log(`Day ${dayNumber} vehicle updated from API:`, vehicleType, `${totalPax} pax`)
            } else {
                console.log(`Day ${dayNumber} vehicle fetch skipped - no tour selected`)
            }

        } catch (error) {
            console.error('Error handling vehicle selection:', error)
        } finally {
            // Remove loading state
            const vehicleSection = document.querySelector(`#day-${dayNumber} .vehicle-section`)
            if (vehicleSection) {
                vehicleSection.style.opacity = '1'
            }
        }
    }

    // Get correct pax count based on current mode
    getCorrectPaxCount(dayNumber) {
        const isCustomizeMode = this.bookingForm.tourInfoForm.isCustomizeMode()

        if (isCustomizeMode) {
            return this.bookingForm.tourInfoForm.getDayPaxCount(dayNumber)
        } else {
            return this.bookingForm.tourInfoForm.getTotalPaxCount()
        }
    }

    updateVehicleUI(dayNumber, vehicleData, totalPax, vehicleType, paxData = null, preCalculatedPrice = null) {
        // Check if vehicleData is valid
        if (!vehicleData) {
            console.error(`Day ${dayNumber}: vehicleData is null or undefined`)
            return
        }

        // Get base price from API data
        const basePriceFromAPI = parseFloat(vehicleData.price) || 0

        // Get detailed passenger info - use paxData if provided, otherwise get from tour form
        let adults, children1, children2, children3

        if (paxData) {
            adults = paxData.adults || 0
            children1 = paxData.children1 || 0
            children2 = paxData.children2 || 0
            children3 = paxData.children3 || 0
        } else {
            const tourInfo = this.bookingForm.tourInfoForm.getFormData()
            adults = tourInfo.adults || 0
            children1 = tourInfo.children1 || 0  // 0-2 years: Free
            children2 = tourInfo.children2 || 0  // 3-6 years: 60%
            children3 = tourInfo.children3 || 0  // 7-12 years: 80%
        }

        // Use pre-calculated price if provided, otherwise calculate
        let actualPrice

        if (preCalculatedPrice !== null) {
            actualPrice = preCalculatedPrice
        } else {
            // Calculate price according to age formula
            actualPrice = this.calculatePriceByAge(basePriceFromAPI, totalPax, adults, children1, children2, children3)
        }

        // Update vehicle section title
        const vehicleTitle = document.querySelector(`#day-${dayNumber} .vehicle-header .section-title`)
        if (vehicleTitle) {
            vehicleTitle.textContent = `Images for ${vehicleData.title || 'Vehicle'}`
        }

        // Update vehicle subtitle with pax info
        const vehicleSubtitle = document.querySelector(`#day-${dayNumber} .vehicle-subtitle`)
        if (vehicleSubtitle) {
            vehicleSubtitle.innerHTML = `Suitable for tour from: <strong>2 - ${totalPax}pax</strong>`
        }

        // Update vehicle images
        const vehicleImages = document.querySelector(`#day-${dayNumber} .vehicle-images`)
        if (vehicleImages) {
            vehicleImages.innerHTML = ''

            // Check if gallery exists and has images
            if (vehicleData.gallery && Array.isArray(vehicleData.gallery) && vehicleData.gallery.length > 0) {
                // Show up to 4 images
                const imagesToShow = vehicleData.gallery.slice(0, 4)
                imagesToShow.forEach((imageUrl, index) => {
                    const img = document.createElement('img')
                    img.src = imageUrl
                    img.alt = `Vehicle ${index + 1}`
                    img.onerror = () => {
                        // Fallback image if URL fails
                        img.src = 'https://lotus.okhub-tech.com/wp-content/uploads/2025/07/f8db611af1aa926ea29a0ff936ef26f4b3e33a12.png'
                    }
                    vehicleImages.appendChild(img)
                })

                // Fill remaining slots with the first image if less than 4 images
                while (vehicleImages.children.length < 4 && vehicleData.gallery[0]) {
                    const img = document.createElement('img')
                    img.src = vehicleData.gallery[0]
                    img.alt = `Vehicle ${vehicleImages.children.length + 1}`
                    img.onerror = () => {
                        img.src = 'https://lotus.okhub-tech.com/wp-content/uploads/2025/07/f8db611af1aa926ea29a0ff936ef26f4b3e33a12.png'
                    }
                    vehicleImages.appendChild(img)
                }
            } else {
                // Fallback: create 4 placeholder images
                const fallbackImageUrl = 'https://lotus.okhub-tech.com/wp-content/uploads/2025/07/f8db611af1aa926ea29a0ff936ef26f4b3e33a12.png'
                for (let i = 0; i < 4; i++) {
                    const img = document.createElement('img')
                    img.src = fallbackImageUrl
                    img.alt = `Vehicle ${i + 1}`
                    vehicleImages.appendChild(img)
                }
            }
        }

        // Update total price with calculated price
        const totalPriceElement = document.querySelector(`#day-${dayNumber} .total-price-day`)
        if (totalPriceElement) {
            totalPriceElement.textContent = `${Math.round(actualPrice)}$`
        }

        // Update itinerary description with calculated price
        const itineraryOptions = document.querySelectorAll(`#day-${dayNumber} .itinerary-option`)
        itineraryOptions.forEach(option => {
            const radio = option.querySelector('input[type="radio"]')
            const description = option.querySelector('.itinerary-description')

            if (radio && description && radio.value === vehicleType) {
                const vehicleTypeLabel = vehicleType === 'standard' ? 'Standard' : 'VIP'
                description.textContent = `${vehicleTypeLabel} car for ${totalPax} pax price ${Math.round(actualPrice)} USD`
            }
        })

        // Store calculated price in vehicle data for later use
        if (this.dailyPlans[dayNumber] && this.dailyPlans[dayNumber].vehicle) {
            this.dailyPlans[dayNumber].vehicle.calculatedPrice = actualPrice
            this.dailyPlans[dayNumber].vehicle.originalPrice = basePriceFromAPI
            this.dailyPlans[dayNumber].vehicle.priceBreakdown = {
                adults: adults,
                children1: children1,
                children2: children2,
                children3: children3,
                basePricePerPerson: totalPax > 0 ? basePriceFromAPI / totalPax : 0
            }

            // Calculate day total price when vehicle price is updated
            this.calculateDayTotalPrice(dayNumber)
        }
    }

    // Delegate price calculation to VehicleManager
    calculatePriceByAge(totalPriceFromAPI, totalPax, adults, children1, children2, children3) {
        return this.vehicleManager.calculatePriceByAge(totalPriceFromAPI, totalPax, adults, children1, children2, children3)
    }
    renderTours(dayNumber, tours) {
        const tourCards = document.getElementById(`tourCards-${dayNumber}`)

        if (!tours || !Array.isArray(tours) || tours.length === 0) {
            tourCards.innerHTML = '<div class="error">No tours found for selected criteria.</div>'
            return
        }

        console.log(`Rendering ${tours.length} tours for day ${dayNumber}:`, tours)

        tourCards.innerHTML = tours
            .map((tour, index) => {
                console.log(`Rendering tour ${index}:`, { id: tour.id, name: tour.name })

                // Ensure tour ID is valid and is a string
                const tourId = String(tour.id || `fallback-tour-${index}-${Date.now()}`)

                return `
                  <div class="tour-card" data-tour-id="${tourId}" data-day="${dayNumber}">
                  <div class="tour-image">
                      <img src="${tour.image}" alt="${tour.name}">
                  </div>
                  <div class="tour-info">
                      <h4 class="tour-title">${tour.name}</h4>
                      <div class="tour-meta">
                          <p class="tour-departure">Departure: <span>Hanoi</span></p>
                              <p class="tour-type">Type: <span>${tour.type || 'Guided Tour'}</span></p>
                      </div>
                  </div>
                  <div class="tour-taxonomy">
                            ${(tour.services || []).map((service) => `<p class="service-taxonomy">${service}</p>`).join("")}
                    </div>
              </div>
              `
            })
            .join("")

        // Add click events to tour cards
        tourCards.querySelectorAll(".tour-card").forEach((card) => {
            card.addEventListener("click", async () => {
                // Disable card during selection to prevent double clicks
                card.style.pointerEvents = 'none'
                card.style.opacity = '0.7'

                try {
                    const tourId = String(card.dataset.tourId) // Ensure string
                    console.log('Card dataset tourId:', tourId, typeof tourId)
                    console.log('Tours array:', tours)
                    console.log('Tour IDs in array:', tours.map(t => ({ id: t.id, type: typeof t.id })))

                    let selectedTour = tours.find(t => String(t.id) === tourId) // String comparison
                    console.log('Selected tour:', selectedTour)


                    if (!selectedTour) {
                        console.error('Tour not found for ID:', tourId)
                        console.log('Available tour IDs:', tours.map(t => t.id))

                        // Create fallback tour object
                        selectedTour = {
                            id: String(tourId), // Ensure string consistency
                            name: card.querySelector('.tour-title')?.textContent || 'Selected Tour',
                            description: 'Tour details not available',
                            image: card.querySelector('.tour-image img')?.src || '/placeholder.svg',
                            type: 'Guided Tour',
                            services: ['Professional guide'],
                            price: 200,
                            duration: 'Full day',
                            rating: 4.5,
                            link: '#'
                        }
                        console.log('Using fallback tour:', selectedTour)
                    }

                    await this.selectTour(dayNumber, card, selectedTour)
                } catch (error) {
                    console.error('Error selecting tour:', error)
                } finally {
                    // Re-enable card
                    card.style.pointerEvents = 'auto'
                    card.style.opacity = '1'
                }
            })
        })
    }

    async selectTour(dayNumber, selectedCard, tourData) {
        // Initialize dailyPlans for this day if not exists
        if (!this.dailyPlans[dayNumber]) {
            this.dailyPlans[dayNumber] = {}
        }

        const tourCards = document.getElementById(`tourCards-${dayNumber}`)
        tourCards.querySelectorAll(".tour-card").forEach((card) => {
            card.classList.remove("selected")
        })
        selectedCard.classList.add("selected")

        // Store selected tour data with more details
        this.dailyPlans[dayNumber] = {
            ...this.dailyPlans[dayNumber],
            selectedTour: String(tourData.id),  // Ensure string for consistency
            selectedTourData: tourData
        }

        console.log(`Day ${dayNumber} tour data stored:`, {
            selectedTour: String(tourData.id),
            selectedTourType: typeof String(tourData.id),
            selectedTourData: tourData
        })

        // Check if basic selection is complete and show next sections
        this.checkAndShowProgressiveSections(dayNumber)

        // Preload both standard and VIP vehicle data
        await this.preloadVehicleData(dayNumber, tourData.id)

        // Update vehicle UI if itinerary type is already selected
        if (this.dailyPlans[dayNumber].itinerary) {
            this.handleCheckVehicle(dayNumber, this.dailyPlans[dayNumber].itinerary)
        }

        // Calculate day total price
        this.calculateDayTotalPrice(dayNumber)
    }

    async preloadVehicleData(dayNumber, tourId) {
        try {
            // Get correct pax count
            const paxData = this.getCorrectPaxCount(dayNumber)
            const totalPax = paxData.totalPax

            if (totalPax === 0) {
                console.log(`Day ${dayNumber} vehicle preload skipped - no pax selected`)
                return
            }

            // Show loading indicator
            const vehicleSection = document.querySelector(`#day-${dayNumber} .vehicle-section`)
            if (vehicleSection) {
                vehicleSection.style.opacity = '0.6'
            }

            console.log(`Day ${dayNumber} preloading vehicle data for both standard and VIP...`)

            // Call both APIs in parallel
            const [standardData, vipData] = await Promise.all([
                this.fetchVehicle(totalPax, 'standard', tourId),
                this.fetchVehicle(totalPax, 'vip', tourId)
            ])

            console.log(`Day ${dayNumber} API results:`, { standardData, vipData })

            // Check if we got valid data
            if (!standardData && !vipData) {
                console.error(`Day ${dayNumber}: Both vehicle API calls failed`)
                return
            }

            // Initialize vehicle cache for this day
            if (!this.dailyPlans[dayNumber]) {
                this.dailyPlans[dayNumber] = {}
            }

            // Store both vehicle types in cache (handle null data)
            this.dailyPlans[dayNumber].vehicleCache = {
                standard: standardData ? {
                    data: standardData,
                    calculatedPrice: this.calculateVehiclePrice(standardData, totalPax, paxData)
                } : null,
                vip: vipData ? {
                    data: vipData,
                    calculatedPrice: this.calculateVehiclePrice(vipData, totalPax, paxData)
                } : null,
                pax: totalPax,
                paxData: paxData
            }

            console.log(`Day ${dayNumber} vehicle cache loaded:`, this.dailyPlans[dayNumber].vehicleCache)

        } catch (error) {
            console.error(`Error preloading vehicle data for day ${dayNumber}:`, error)
        } finally {
            // Remove loading state
            const vehicleSection = document.querySelector(`#day-${dayNumber} .vehicle-section`)
            if (vehicleSection) {
                vehicleSection.style.opacity = '1'
            }
        }
    }

    calculateVehiclePrice(vehicleData, totalPax, paxData) {
        if (!vehicleData) {
            console.warn('calculateVehiclePrice: vehicleData is null')
            return 0
        }

        if (!vehicleData.price) {
            console.warn('calculateVehiclePrice: vehicleData.price is missing')
            return 0
        }

        const basePriceFromAPI = parseFloat(vehicleData.price) || 0

        console.log('calculateVehiclePrice:', {
            vehicleData,
            basePriceFromAPI,
            totalPax,
            paxData
        })

        return this.calculatePriceByAge(
            basePriceFromAPI,
            totalPax,
            paxData.adults || 0,
            paxData.children1 || 0,
            paxData.children2 || 0,
            paxData.children3 || 0
        )
    }

    // Clear vehicle cache for a specific day (useful when pax count changes)
    clearVehicleCache(dayNumber) {
        if (this.dailyPlans[dayNumber] && this.dailyPlans[dayNumber].vehicleCache) {
            delete this.dailyPlans[dayNumber].vehicleCache
            console.log(`Day ${dayNumber} vehicle cache cleared`)
        }
    }

    // Check progress and show appropriate sections
    checkAndShowProgressiveSections(dayNumber) {
        // Check if basic selections (city, tour type, tour) are complete
        if (this.isBasicSelectionComplete(dayNumber)) {
            this.showItineraryAndGuideSection(dayNumber)
        }
    }

    // Check if basic selections are complete
    isBasicSelectionComplete(dayNumber) {
        const citySearch = document.getElementById(`city-${dayNumber}`)
        const tourTypeSearch = document.getElementById(`tourType-${dayNumber}`)
        const selectedTour = document.querySelector(`#tourCards-${dayNumber} .tour-card.selected`)

        return citySearch?.value &&
            tourTypeSearch?.value &&
            selectedTour
    }

    // Show itinerary, vehicle, and guide sections
    showItineraryAndGuideSection(dayNumber) {
        const sectionsToShow = [
            '.itinerary-section',
            '.vehicle-section',
            '.guide-section'
        ]

        sectionsToShow.forEach(selector => {
            const section = document.querySelector(`#day-${dayNumber} ${selector}`)
            if (section) {
                section.style.display = 'block'
                section.classList.add('section-visible')
            }
        })

        // After a short delay, show service sections
        setTimeout(() => {
            this.showServiceSections(dayNumber)
        }, 500)
    }

    // Show food, hotel, and other services sections
    showServiceSections(dayNumber) {
        const sectionsToShow = [
            '.food-section',
            '.hotel-section',
            '.services-section'
        ]

        sectionsToShow.forEach(selector => {
            const section = document.querySelector(`#day-${dayNumber} ${selector}`)
            if (section) {
                section.style.display = 'block'
                section.classList.add('section-visible')
            }
        })

        // Set default selections when service sections are first shown
        setTimeout(() => {
            this.setDefaultServiceSelections(dayNumber)
        }, 100)
    }

    // Set default selections for service sections when they are first shown
    async setDefaultServiceSelections(dayNumber) {
        // Load hotels from API first
        await this.loadHotelsForDay(dayNumber)

        // Set default food selection to vietnamese (first option)
        const defaultFoodRadio = document.querySelector(`#day-${dayNumber} .food-radio[value="vietnamese"]`)
        if (defaultFoodRadio && !this.dailyPlans[dayNumber]?.food) {
            defaultFoodRadio.checked = true
            this.updateFoodSelection(dayNumber, 'vietnamese')
        }

        // Default hotel selection will be handled by loadHotelsForDay

        // Set default extra bed selection to no-need
        const defaultExtraBedRadio = document.querySelector(`#day-${dayNumber} .extra-bed-radio[value="no-need"]`)
        if (defaultExtraBedRadio && !this.dailyPlans[dayNumber]?.extraBed) {
            defaultExtraBedRadio.checked = true
            this.updateExtraBedSelection(dayNumber, 'no-need')
        }
    }

    // Load hotels for a specific day
    async loadHotelsForDay(dayNumber, postId = 467) {
        try {
            console.log(`Loading hotels for day ${dayNumber}`)
            const hotels = await this.hotelManager.fetchHotels(postId)

            // Get current room count
            const roomCount = this.dailyPlans[dayNumber]?.roomCount ?? 0

            // Render hotel options
            this.hotelManager.renderHotelOptions(dayNumber, hotels, roomCount)

            // Set up hotel change event listeners
            this.setupHotelEventListeners(dayNumber, hotels)

            // Set default hotel selection if not already set
            if (!this.dailyPlans[dayNumber]?.hotel && hotels.length > 0) {
                if (!this.dailyPlans[dayNumber]) {
                    this.dailyPlans[dayNumber] = {}
                }
                this.dailyPlans[dayNumber].hotel = hotels[0].value
                this.updateHotelSelection(dayNumber, hotels[0].value)
                console.log(`Default hotel set for day ${dayNumber}: ${hotels[0].value}`)
            }

            console.log(`Hotels loaded for day ${dayNumber}:`, hotels)
            return hotels
        } catch (error) {
            console.error(`Error loading hotels for day ${dayNumber}:`, error)
            return []
        }
    }

    // Setup event listeners for hotel selection
    setupHotelEventListeners(dayNumber, hotels) {
        const hotelRadios = document.querySelectorAll(`input[name="hotel-${dayNumber}"]`)

        hotelRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    const selectedHotel = hotels.find(hotel => hotel.value === radio.value)
                    if (selectedHotel) {
                        // Update gallery
                        this.hotelManager.updateHotelGallery(dayNumber, selectedHotel)

                        // Store selection and recalculate price
                        this.updateHotelSelection(dayNumber, selectedHotel.value)

                        console.log(`Hotel selection updated for day ${dayNumber}:`, selectedHotel)
                    }
                }
            })
        })
    }

    updateRoomCount(dayNumber, change) {
        // Initialize dailyPlans for this day if not exists
        if (!this.dailyPlans[dayNumber]) {
            this.dailyPlans[dayNumber] = {}
        }

        const roomCountElement = document.getElementById(`roomCount-${dayNumber}`)

        // Get current room count (not extra bed count!)
        let currentCount = typeof this.dailyPlans[dayNumber]?.roomCount === 'number'
            ? this.dailyPlans[dayNumber].roomCount
            : 0

        // Calculate new count
        const newCount = Math.max(0, currentCount + change)

        // Update display
        roomCountElement.textContent = newCount.toString().padStart(2, "0")

        // Update room count in all hotel options
        const hotelRoomCounts = document.querySelectorAll(`#day-${dayNumber} .hotel-room-count`)
        hotelRoomCounts.forEach(element => {
            element.textContent = newCount
        })

        // Store room count
        this.dailyPlans[dayNumber] = {
            ...this.dailyPlans[dayNumber],
            roomCount: newCount,
        }

        // Calculate day total price
        this.calculateDayTotalPrice(dayNumber)

        console.log(`Day ${dayNumber} room count updated: ${currentCount} → ${newCount}`)
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

        // Calculate grand total after confirming day
        this.calculateGrandTotal()
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

        // Validate pax count for customize mode
        if (this.bookingForm.tourInfoForm.isCustomizeMode()) {
            const dayPaxData = this.bookingForm.tourInfoForm.getDayPaxCount(dayNumber)
            if (dayPaxData.totalPax < 1) {
                alert("Please select at least 1 passenger for this day")
                return false
            }
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

        // Get guide selection
        const guideSearch = document.getElementById(`guide-${dayNumber}`)
        const guide = guideSearch ? guideSearch.value : ''
        const guideValue = guideSearch ? guideSearch.dataset.value : ''

        // Get itinerary selection
        const itineraryRadio = document.querySelector(`input[name="itinerary-${dayNumber}"]:checked`)
        const itinerary = itineraryRadio ? itineraryRadio.value : ''

        // Get food selection
        const foodRadio = document.querySelector(`input[name="food-${dayNumber}"]:checked`)
        const food = foodRadio ? foodRadio.value : ''

        // Get hotel selection
        const hotelRadio = document.querySelector(`input[name="hotel-${dayNumber}"]:checked`)
        const hotel = hotelRadio ? hotelRadio.value : ''

        // Get extra bed selection
        const extraBedRadio = document.querySelector(`input[name="extra-bed-${dayNumber}"]:checked`)
        const extraBed = extraBedRadio ? extraBedRadio.value : ''

        // Get tour info from dailyPlans
        const tourData = this.dailyPlans[dayNumber]?.selectedTourData || {}

        // Collect selected services
        const services = []
        document.querySelectorAll(`input[type="checkbox"][name*="-${dayNumber}"]:checked`).forEach((checkbox) => {
            const serviceName = checkbox.name.replace(`-${dayNumber}`, "")
            services.push(serviceName)
        })

        const collectedData = {
            location,
            city,
            cityValue,
            tourType,
            tourTypeValue,
            selectedTour: this.dailyPlans[dayNumber]?.selectedTour || (selectedTour ? String(selectedTour.dataset.tourId) : null),
            selectedTourData: tourData,
            roomCount,
            guide,
            guideValue,
            itinerary,
            food,
            hotel,
            extraBed,
            extraBedCount: this.dailyPlans[dayNumber]?.extraBedCount || 0,
            services,
            confirmed: true,
            totalPrice: this.dailyPlans[dayNumber]?.totalPrice || 0,
            vehicleCache: this.dailyPlans[dayNumber]?.vehicleCache, // Preserve vehicle cache
            toursData: this.dailyPlans[dayNumber]?.toursData, // Preserve tours data
            vehicle: this.dailyPlans[dayNumber]?.vehicle // Preserve vehicle pricing data
        }

        console.log(`Collected data for day ${dayNumber}:`, collectedData)

        return collectedData
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
            <button type="button" class="see-detail-btn" data-day="${dayNumber}">See Details</button>
        `

        // Add event listener for the dynamically created See Details button
        const seeDetailBtn = collapsedContent.querySelector(".see-detail-btn")
        if (seeDetailBtn) {
            seeDetailBtn.addEventListener("click", (e) => {
                e.preventDefault() // Prevent form submission
                e.stopPropagation() // Stop event bubbling
                this.expandDay(dayNumber)
            })
        }
    }

    expandDay(dayNumber) {
        const dayContent = document.getElementById(`dayContent-${dayNumber}`)
        const dayCollapsed = document.getElementById(`dayCollapsed-${dayNumber}`)

        dayContent.style.display = "block"
        dayCollapsed.style.display = "none"

        console.log(`Expanding day ${dayNumber}`, this.dailyPlans[dayNumber])

        // Show all sections for confirmed days when expanding
        if (this.dailyPlans[dayNumber]?.confirmed) {
            console.log(`Day ${dayNumber} is confirmed, showing all sections and restoring form state`)
            this.showAllSectionsForConfirmedDay(dayNumber)

            // Restore form state for confirmed days
            setTimeout(() => {
                this.restoreFormStateForDay(dayNumber)
            }, 50)
        } else {
            // For unconfirmed days, check progressive disclosure
            console.log(`Day ${dayNumber} is not confirmed, checking progressive disclosure`)
            this.checkAndShowProgressiveSections(dayNumber)
        }

        // Re-initialize events for the expanded day
        this.initDayEvents(dayNumber)
    }

    // Show all sections for a confirmed day when expanding
    showAllSectionsForConfirmedDay(dayNumber) {
        const allSections = [
            '.itinerary-section',
            '.vehicle-section',
            '.guide-section',
            '.food-section',
            '.hotel-section',
            '.services-section'
        ]

        console.log(`Showing all sections for confirmed day ${dayNumber}`)

        allSections.forEach(selector => {
            const section = document.querySelector(`#day-${dayNumber} ${selector}`)
            if (section) {
                section.style.display = 'block'
                section.classList.add('section-visible')
            }
        })
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
    }

    // Guide dropdown methods
    initGuideDropdown(dayNumber) {
        // Initialize guide dropdown with options
    }

    showAllGuides(dayNumber) {
        const dropdown = document.getElementById(`guideDropdown-${dayNumber}`)
        if (!dropdown) return

        const optionsContainer = dropdown.querySelector(".dropdown-options-container")
        if (!optionsContainer) return

        optionsContainer.innerHTML = ""
        dropdown.style.display = "block"

        // Use GuideManager to get guide options
        this.guideManager.getGuideOptions().forEach((guide) => {
            const option = document.createElement("div")
            option.className = "dropdown-option"
            option.setAttribute("data-lang", guide.value)
            option.innerHTML = `${guide.flag} ${guide.label}`
            option.addEventListener("click", () => {
                const guideSearch = document.getElementById(`guide-${dayNumber}`)
                guideSearch.value = `${guide.flag} ${guide.label}`
                guideSearch.dataset.value = guide.value
                dropdown.style.display = "none"

                // Store guide selection immediately
                if (!this.dailyPlans[dayNumber]) {
                    this.dailyPlans[dayNumber] = {}
                }
                this.dailyPlans[dayNumber].guide = `${guide.flag} ${guide.label}`
                this.dailyPlans[dayNumber].guideValue = guide.value
            })
            optionsContainer.appendChild(option)
        })

        // Focus on search input after dropdown is shown
        setTimeout(() => {
            const searchInput = dropdown.querySelector(".dropdown-search-input")
            if (searchInput) {
                searchInput.focus()
            }
        }, 50)
    }

    // Search guides by name
    searchGuides(dayNumber, query) {
        const dropdown = document.getElementById(`guideDropdown-${dayNumber}`)
        if (!dropdown) return

        const optionsContainer = dropdown.querySelector(".dropdown-options-container")
        if (!optionsContainer) return

        optionsContainer.innerHTML = ""

        const filteredGuides = this.guideManager.getGuideOptions().filter(guide =>
            guide.label.toLowerCase().includes(query.toLowerCase())
        )

        dropdown.style.display = "block" // Always show dropdown when searching

        if (filteredGuides.length === 0) {
            const noResults = document.createElement("div")
            noResults.className = "dropdown-option no-results"
            noResults.innerHTML = "No guides found"
            noResults.style.color = "#999"
            noResults.style.fontStyle = "italic"
            optionsContainer.appendChild(noResults)
        } else {
            filteredGuides.forEach((guide) => {
                const option = document.createElement("div")
                option.className = "dropdown-option"
                option.setAttribute("data-lang", guide.value)
                option.innerHTML = `${guide.flag} ${guide.label}`
                option.addEventListener("click", () => {
                    const guideSearch = document.getElementById(`guide-${dayNumber}`)
                    guideSearch.value = `${guide.flag} ${guide.label}`
                    guideSearch.dataset.value = guide.value
                    dropdown.style.display = "none"

                    // Store guide selection immediately
                    if (!this.dailyPlans[dayNumber]) {
                        this.dailyPlans[dayNumber] = {}
                    }
                    this.dailyPlans[dayNumber].guide = `${guide.flag} ${guide.label}`
                    this.dailyPlans[dayNumber].guideValue = guide.value
                })
                optionsContainer.appendChild(option)
            })
        }
    }

    // Itinerary selection method
    updateItinerarySelection(dayNumber, value) {
        // Initialize dailyPlans for this day if not exists
        if (!this.dailyPlans[dayNumber]) {
            this.dailyPlans[dayNumber] = {}
        }

        // Store itinerary selection
        this.dailyPlans[dayNumber] = {
            ...this.dailyPlans[dayNumber],
            itinerary: value
        }

        // Update itinerary description immediately
        this.updateItineraryDescription(dayNumber, value)

        // Only fetch/update vehicle if tour is already selected
        if (this.dailyPlans[dayNumber].selectedTour) {
            this.handleCheckVehicle(dayNumber, value)
        }

        console.log(`Day ${dayNumber} itinerary updated:`, value)
    }

    // Update itinerary description without vehicle data
    updateItineraryDescription(dayNumber, vehicleType) {
        const itineraryOptions = document.querySelectorAll(`#day-${dayNumber} .itinerary-option`)
        itineraryOptions.forEach(option => {
            const radio = option.querySelector('input[type="radio"]')
            const description = option.querySelector('.itinerary-description')

            if (radio && description && radio.value === vehicleType) {
                const vehicleTypeLabel = vehicleType === 'standard' ? 'Standard' : 'VIP'
                const tourInfo = this.bookingForm.tourInfoForm.getFormData()
                // description.textContent = `${vehicleTypeLabel} car for ${tourInfo.totalPax} pax (Select tour to see price)`
            }
        })

        // Clear vehicle section until tour is selected
        // const vehicleTitle = document.querySelector(`#day-${dayNumber} .vehicle-header .section-title`)
        // if (vehicleTitle) {
        //     vehicleTitle.textContent = 'Select tour to see vehicle options'
        // }

        // const vehicleSubtitle = document.querySelector(`#day-${dayNumber} .vehicle-subtitle`)
        // if (vehicleSubtitle) {
        //     vehicleSubtitle.innerHTML = 'Please select a tour first'
        // }

        // const vehicleImages = document.querySelector(`#day-${dayNumber} .vehicle-images`)
        // if (vehicleImages) {
        //     vehicleImages.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">Select a tour to see vehicle options</div>'
        // }

        const totalPriceElement = document.querySelector(`#day-${dayNumber} .total-price-day`)
        if (totalPriceElement) {
            totalPriceElement.textContent = ''
        }
    }

    // Food selection method
    updateFoodSelection(dayNumber, value) {
        // Initialize dailyPlans for this day if not exists
        if (!this.dailyPlans[dayNumber]) {
            this.dailyPlans[dayNumber] = {}
        }

        // Store food selection
        this.dailyPlans[dayNumber] = {
            ...this.dailyPlans[dayNumber],
            food: value
        }

        // Update food gallery title based on selection
        const foodImages = document.querySelector(`#day-${dayNumber} .food-images h4`)
        if (foodImages) {
            const selectedFood = this.getFoodOptionLabel(value)
            foodImages.textContent = `Images for ${selectedFood}`
        }

        // Calculate day total price
        this.calculateDayTotalPrice(dayNumber)

        console.log(`Day ${dayNumber} food updated:`, value)
    }

    getFoodOptionLabel(value) {
        return this.serviceManager.getFoodOptionLabel(value)
    }

    // Hotel selection method
    updateHotelSelection(dayNumber, value) {
        // Initialize dailyPlans for this day if not exists
        if (!this.dailyPlans[dayNumber]) {
            this.dailyPlans[dayNumber] = {}
        }

        // Store hotel selection
        this.dailyPlans[dayNumber] = {
            ...this.dailyPlans[dayNumber],
            hotel: value
        }

        // Update selected hotel name in images section
        const selectedHotelName = document.querySelector(`#day-${dayNumber} .selected-hotel-name`)
        if (selectedHotelName) {
            // Try to find hotel name from current hotels in HotelManager
            const currentHotels = this.hotelManager.currentHotels || []
            const selectedHotel = currentHotels.find(hotel => hotel.value === value)

            if (selectedHotel) {
                selectedHotelName.textContent = selectedHotel.name
            } else {
                // Fallback to static names for compatibility
                const hotelNames = {
                    'lotus-economy': 'Lotus Economy',
                    'lotus-deluxe': 'Lotus Deluxe',
                    'lotus-premium': 'Lotus Premium',
                    'lotus-vip': 'Lotus VIP'
                }
                selectedHotelName.textContent = hotelNames[value] || value
            }
        }

        // Calculate day total price
        this.calculateDayTotalPrice(dayNumber)
    }

    // Extra bed selection method
    updateExtraBedSelection(dayNumber, value) {
        // Initialize dailyPlans for this day if not exists
        if (!this.dailyPlans[dayNumber]) {
            this.dailyPlans[dayNumber] = {}
        }

        // Store extra bed selection
        this.dailyPlans[dayNumber] = {
            ...this.dailyPlans[dayNumber],
            extraBed: value
        }

        // Show/hide extra bed input group based on selection
        const extraBedInputGroup = document.querySelector(`#day-${dayNumber} .extra-bed-input-group`)
        if (extraBedInputGroup) {
            if (value === 'add-extra-bed') {
                extraBedInputGroup.style.display = 'block'
                // Initialize extra bed count if not set
                if (!this.dailyPlans[dayNumber].extraBedCount) {
                    this.dailyPlans[dayNumber].extraBedCount = 1
                    const extraBedCountElement = document.querySelector(`#day-${dayNumber} .extra-bed-count`)
                    if (extraBedCountElement) {
                        extraBedCountElement.textContent = '01'
                    }
                }
            } else {
                extraBedInputGroup.style.display = 'none'
                // Clear extra bed count when not needed
                this.dailyPlans[dayNumber].extraBedCount = 0
            }
        }

        // Calculate day total price
        this.calculateDayTotalPrice(dayNumber)

        console.log(`Day ${dayNumber} extra bed updated:`, value)
    }

    // Extra bed count update method
    updateExtraBedCount(dayNumber, change) {
        // Initialize dailyPlans for this day if not exists
        if (!this.dailyPlans[dayNumber]) {
            this.dailyPlans[dayNumber] = {}
        }

        const extraBedCountElement = document.querySelector(`#day-${dayNumber} .extra-bed-count`)
        const extraBedError = document.querySelector(`#day-${dayNumber} .extra-bed-error`)
        const roomCount = this.dailyPlans[dayNumber]?.roomCount || 1

        let currentCount = typeof this.dailyPlans[dayNumber]?.extraBedCount === 'number'
            ? this.dailyPlans[dayNumber].extraBedCount
            : 0
        currentCount = Math.max(0, currentCount + change)

        // Validate extra bed count must be less than or equal to room count
        if (currentCount > roomCount) {
            if (extraBedError) extraBedError.style.display = 'block'
            return // Don't update if validation fails
        } else {
            if (extraBedError) extraBedError.style.display = 'none'
        }

        // Update display
        if (extraBedCountElement) {
            extraBedCountElement.textContent = currentCount.toString().padStart(2, '0')
        }

        // Store extra bed count
        this.dailyPlans[dayNumber] = {
            ...this.dailyPlans[dayNumber],
            extraBedCount: currentCount
        }

        // Calculate day total price
        this.calculateDayTotalPrice(dayNumber)

        console.log(`Day ${dayNumber} extra bed count updated:`, currentCount)
    }

    // Calculate total price for a specific day using PriceCalculator
    calculateDayTotalPrice(dayNumber) {
        const totalPrice = this.priceCalculator.calculateDayTotalPrice(dayNumber, this.dailyPlans)

        // Store total price for this day
        if (this.dailyPlans[dayNumber]) {
            this.dailyPlans[dayNumber].totalPrice = totalPrice
        }

        // Calculate grand total for all days
        this.calculateGrandTotal()

        console.log(`Day ${dayNumber} total price: $${totalPrice.toFixed(2)}`)
    }

    // Calculate grand total for all confirmed days using PriceCalculator
    calculateGrandTotal() {
        this.grandTotal = this.priceCalculator.calculateGrandTotal(this.dailyPlans)
        console.log(`Grand total for all days: $${this.grandTotal.toFixed(2)}`)
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

    // Load hotels for static day 1 (example day in HTML)
    async loadHotelsForStaticDay1() {
        try {
            console.log('Loading hotels for static day 1')
            const hotels = await this.hotelManager.fetchHotels(467)

            // Render hotels for static day 1
            this.hotelManager.renderHotelOptions(1, hotels, 0)

            // Set up event listeners for static day 1
            this.setupHotelEventListeners(1, hotels)

            // Set default values for static day 1
            if (!this.dailyPlans[1]) {
                this.dailyPlans[1] = {}
            }
            if (hotels.length > 0) {
                this.dailyPlans[1].hotel = hotels[0].value
                this.dailyPlans[1].roomCount = 0
            }

            console.log('Hotels loaded for static day 1:', hotels)
        } catch (error) {
            console.error('Error loading hotels for static day 1:', error)
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

    // Load hotels for static day 1 (example day)
    dailyPlanForm.loadHotelsForStaticDay1()

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
