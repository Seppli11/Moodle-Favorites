// ==UserScript==
// @name        Moodle Favorites
// @namespace   Violentmonkey Scripts
// @match       https://moodle.zhaw.ch/*
// @grant       none
// @version     1.1
// @author      sebastian.zumbrunn@pm.me
// @description Favorite courses in Moodle
// ==/UserScript==


const FAVORITES_LOCAL_STORAGE = "favorites"
const NAVBAR_CLASS = "primary-navigation"
const MAX_NAME_LENGTH = 30

// ------ Utils Function ------
function addGlobalStyle(css) {
  const head = document.getElementsByTagName('head')[0];
  if (!head) { return; }
  const style = document.createElement('style');
  style.innerHTML = css;
  head.appendChild(style);
}

function shortenString(str) {
  if (str == null) return "";
  return str.substring(0, Math.min(str.length, MAX_NAME_LENGTH))
}

function loadCourseId() {
  const searchParam = new URLSearchParams(location.search)
  return searchParam.get("id")
}

function getCourseUrl(courseId) {
  return `${location.origin}/course/view.php?id=${courseId}`
}


// ------ Model ------

class Model {
  #favorites = []
  #listeners = []

  constructor() {
    this.load()
    this.addListener(() => this.store())
  }

  addListener(listener) {
    this.#listeners.push(listener)
  }

  #fireListeners() {
    this.#listeners.forEach(listener => listener())
  }

  get favorites() {
    return this.#favorites
  }

  getFavorite(courseId) {
    return this.#favorites.find(obj => obj.id == courseId)
  }

  addFavorite({ name, id }) {
    if (this.courseAlreadyFavoritized(id)) {
      console.log("Page is already a favorite")
      return
    }
    this.#favorites.push({ name, id })
    this.#fireListeners()
  }

  addCurrentCourse() {
    const name = document.title.replace("Kurs: ", "")
    this.addFavorite({ name, id: courseId })
  }

  deleteFavorite(courseId) {
    this.#setFavorites(this.favorites.filter(obj => obj.id != courseId))
  }


  courseAlreadyFavoritized(courseId) {
    return this.getFavorite(courseId) != null
  }

  editFavorite(courseId, newName) {
    const favoriteObj = this.getFavorite(courseId)
    if (favoriteObj == null) {
      console.warn(`course id ${courseId} not found`);
      return
    }

    favoriteObj.name = newName
    this.#fireListeners()
  }

  #setFavorites(favorites) {
    const changed = this.#favorites != favorites
    this.#favorites = favorites;

    if (changed) this.#fireListeners()
  }

  load() {
    try {
      let favorites = JSON.parse(localStorage.getItem(FAVORITES_LOCAL_STORAGE) ?? "[]")
      if (!Array.isArray(favorites)) {
        console.warn("Loaded favorites isn't an array")
        this.#setFavorites([])
        return;
      }
      favorites = favorites.map(({ name = "", id = 0 }) => ({ name, id }))
      this.#setFavorites(favorites)
    } catch (e) {
      console.error("Couldn't load favorites", e);
      this.#setFavorites([])
    }
  }

  store() {
    const favoritesStr = JSON.stringify(this.#favorites)
    localStorage.setItem(FAVORITES_LOCAL_STORAGE, favoritesStr)
  }
}


// ------ UI ------

function findPrimaryNavbarEl() {
  const primary_navbar_div = document.getElementsByClassName(NAVBAR_CLASS)[0]
  const navbarList = primary_navbar_div.querySelector("ul")
  return navbarList
}


function createFavoriteBar() {
  addGlobalStyle(`
  @import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.3/font/bootstrap-icons.css");
  #favorite-dropdown > div.dropdown-item {
    display: flex;
    justify-content: space-between;
    align-content: center;
  }

  #favorite-dropdown .fav-btn {
    margin-left: 5px;
    cursor: pointer;
    transform: scale(0.85);
    transition: transform 0.15s;
  }

  #favorite-dropdown .fav-btn:hover{
    transform: scale(1);
  }


  #favorite-dropdown a{
    width: unset;
    flex-grow: 1;
  }
  `)

  console.log("add favorite to bar")
  const navEl = findPrimaryNavbarEl()


  const favoriteEl = document.createElement("li")
  favoriteEl.id = "favorite-el"
  favoriteEl.classList.add("nav-item")
  favoriteEl.innerHTML = `
  <div class="dropdown show">
    <a class="nav-link dropdown-toggle" href="#" role="button" data-toggle="dropdown">Favorites</a>
    <div class="dropdown-menu dropdown-menu-left">
      <div class="carousel slide">
        <div class="carousel-inner">
          <div class="carousel-item active" role="menu" tabindex="-1">
            <div id="favorite-dropdown">
              <span class="dropdown-item disabled">No Favorites</span>
            </div>
            <div class="dropdown-divider"></div>
            <a id="favorite-btn" class="dropdown-item" href="#">Favorite Current Page</a>
          </div>
        </div>
      </div>
    </div>
  </div>`

  navEl.append(favoriteEl)

  const favoriteBtn = navEl.querySelector("#favorite-btn")
  favoriteBtn.addEventListener('click', (e) => {
    e.preventDefault();
    model.addCurrentCourse()
  })
  if (courseId == null || model.courseAlreadyFavoritized(courseId)) {
    favoriteBtn.classList.add("disabled")
  }
}

function updateFavoriteBar() {
  function createDropdownItem(obj) {
    const div = document.createElement("div")
    div.classList.add("dropdown-item")
    div.innerHTML = `
      <a href="${getCourseUrl(obj.id)}">${shortenString(obj.name)}</a>
      <div>
        <i class="edit-btn fav-btn bi bi-pencil-fill"></i>
        <i class="del-btn fav-btn bi bi-trash-fill"></i>
      </div>
    `
    div.querySelector(".del-btn").addEventListener('click', () => model.deleteFavorite(obj.id))
    div.querySelector(".edit-btn").addEventListener('click', e => {

      const newName = prompt("Edit course name:", obj.name)
      if (newName == null || newName.trim() == "") return;
      model.editFavorite(obj.id, newName)
    })

    return div
  }

  const favoriteDropdown = document.getElementById("favorite-dropdown")
  favoriteDropdown.innerHTML = ""
  if (model.favorites.length > 0) {
    model.favorites.map(obj => createDropdownItem(obj)).forEach(domEl => favoriteDropdown.append(domEl))
  } else {
    favoriteDropdown.innerHTML = `<span class="dropdown-item disabled">No Favorites</span>`
  }

  const favoriteBtn = document.getElementById("favorite-btn")
  favoriteBtn.classList.toggle("disabled", model.courseAlreadyFavoritized(courseId) || courseId == null)
}

// ------ Main --------------
const model = new Model()
model.addListener(() => updateFavoriteBar())
const courseId = loadCourseId()

createFavoriteBar()
updateFavoriteBar()