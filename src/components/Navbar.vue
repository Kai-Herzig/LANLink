

<template>
  <nav class="navbar sticky-nav">
    <div class="nav-content">
      <!-- Branding removed -->
      <button class="hamburger" @click="toggleMenu" :aria-expanded="menuOpen.toString()" aria-label="Toggle navigation">
        <span :class="{open: menuOpen}"></span>
        <span :class="{open: menuOpen}"></span>
        <span :class="{open: menuOpen}"></span>
      </button>
      <ul :class="['nav-links', {open: menuOpen}]">
        <li><router-link to="/" active-class="active" @click="closeMenu">Home</router-link></li>
        <li><router-link to="/games" active-class="active" @click="closeMenu">Games</router-link></li>
        <li v-if="userProfile?.isAdmin"><router-link to="/admin" active-class="active" @click="closeMenu">Admin</router-link></li>
        <li><button class="logout-btn" @click="handleLogout">Logout</button></li>
      </ul>
    </div>
  </nav>
</template>



<script setup>
import { ref } from 'vue';
import { useAuth } from '../composables/useAuth';
import { useRouter } from 'vue-router';
const { userProfile, logout } = useAuth();
const router = useRouter();
const menuOpen = ref(false);
function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}
function closeMenu() {
  menuOpen.value = false;
}
async function handleLogout() {
  await logout();
  window.location.href = '/';
}
</script>



<style scoped>
.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 16px;
  height: 56px;
}
.brand {
  font-size: 1.3em;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
}
.hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: none;
  border: none;
  cursor: pointer;
  z-index: 110;
  background: #2563eb;
  padding: 0;
  gap: 5px;
  align-items: center;
}
.hamburger span {
  display: block;
  height: 2px;
  width: 60%;
  transition: .3s;
  background: #fff;
}
.hamburger span.open:nth-child(1) {
  transform: translateY(9px) rotate(45deg);
}
.hamburger span.open:nth-child(2) {
  opacity: 0;
}
.hamburger span.open:nth-child(3) {
  transform: translateY(-9px) rotate(-45deg);
}
.nav-links {
  display: flex;
  align-items: center;
  gap: 24px;
  list-style: none;
  margin: 0;
  padding: 0;
  transition: right 0.3s;
}
.nav-links li {
  display: flex;
  align-items: center;
}
.nav-links a {
  color: #e5e7eb;
  text-decoration: none;
  font-size: 1.1em;
  font-weight: 500;
  padding: 8px 18px;
  border-radius: 6px;
  transition: background 0.2s, color 0.2s;
}
.nav-links a.active, .nav-links a:hover {
  background: #2563eb;
  color: #fff;
}
.logout-btn {
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 18px;
  font-size: 1em;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}
.logout-btn:hover {
  background: #b91c1c;
}
@media (max-width: 700px) {
  .nav-content {
    padding: 0 8px;
  }
  .hamburger {
    display: flex;
  }
  .nav-links {
    position: fixed;
    top: 0;
    right: -100vw;
    height: 100vh;
    width: 70vw;
    max-width: 320px;
    background: #1e293b;
    flex-direction: column;
    align-items: flex-start;
    padding: 80px 24px 24px 24px;
    gap: 18px;
    box-shadow: -2px 0 12px #0005;
    transition: right 0.3s;
    z-index: 120;
  }
  .nav-links.open {
    right: 0;
  }
  .nav-links:not(.open) {
    right: -100vw;
  }
}
</style>
