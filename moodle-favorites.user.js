// ==UserScript==
// @name        Moodle Favorites
// @namespace   Violentmonkey Scripts
// @match       https://moodle.zhaw.ch/*
// @grant       none
// @version     1.1
// @author      sebastian.zumbrunn@pm.me
// @description 22/02/2023, 08:32:03
// ==/UserScript==


const FAVORITES_LOCAL_STORAGE = "favorites"
const NAVBAR_CLASS = "primary-navigation"
const MAX_NAME_LENGTH = 30

function addGlobalStyle(css) {
  const head = document.getElementsByTagName('head')[0];
  if (!head) { return; }
  const style = document.createElement('style');
  style.type = 'text/css';
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

function loadFavorites() {
  try {
    const favorites = JSON.parse(localStorage.getItem(FAVORITES_LOCAL_STORAGE) ?? "[]")
    if (!Array.isArray(favorites)) {
      console.warn("Loaded favorites isn't an array")
      return [];
    }
    favorites.map(({ name = "", id = 0 }) => { name, id })
    return favorites
  } catch (e) {
    console.error("Couldn't load favorites", e);
    return []
  }
}

function storeFavorites() {
  const favoritesStr = JSON.stringify(favorites)
  localStorage.setItem(FAVORITES_LOCAL_STORAGE, favoritesStr)
}

function courseAlreadyFavoritized() {
  return favorites.some(obj => obj.id == courseId)
}

function favoriteCurrentPage() {
  const name = document.title.replace("Kurs: ", "")
  if (courseAlreadyFavoritized()) {
    console.log("Page already favorized")
    return
  }
  favorites.push({ name, id: courseId })
  storeFavorites()
}

function deleteFavorite(courseId) {
  favorites = favorites.filter(obj => obj.id != courseId)
  storeFavorites()
  updateFavoriteBar()
}

function editFavorite(courseId, newName) {
  const favoriteObj = favorites.find(obj => obj.id == courseId)
  if (favoriteObj == null) {
    console.warn(`course id ${courseId} not found`);
    return
  }

  favoriteObj.name = newName
  storeFavorites()
  updateFavoriteBar()
}

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
    favoriteCurrentPage()
    updateFavoriteBar()
  })
  if (courseId == null || courseAlreadyFavoritized()) {
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
    div.querySelector(".del-btn").addEventListener('click', () => deleteFavorite(obj.id))
    div.querySelector(".edit-btn").addEventListener('click', e => {

      const newName = prompt("Edit course name:", obj.name)
      if (newName == null || newName.trim() == "") return;
      editFavorite(obj.id, newName)
    })

    return div
  }

  const favoriteDropdown = document.getElementById("favorite-dropdown")
  favoriteDropdown.innerHTML = ""
  if (favorites.length > 0) {
    favorites.map(obj => createDropdownItem(obj)).forEach(domEl => favoriteDropdown.append(domEl))
  } else {
    favoriteDropdown.innerHTML = `<span class="dropdown-item disabled">No Favorites</span>`
  }

  const favoriteBtn = document.getElementById("favorite-btn")
  favoriteBtn.classList.toggle("disabled", courseAlreadyFavoritized())
}

// ------ MAIN --------------
let favorites = loadFavorites()
const courseId = loadCourseId()

createFavoriteBar()
updateFavoriteBar()