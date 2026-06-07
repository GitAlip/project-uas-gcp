const sign_in_btn = document.querySelector("#sign-in-btn");
const sign_up_btn = document.querySelector("#sign-up-btn");
const container = document.querySelector(".container");

// Toggle form login & register
sign_up_btn.addEventListener("click", () => {
  container.classList.add("sign-up-mode");
});

sign_in_btn.addEventListener("click", () => {
  container.classList.remove("sign-up-mode");
});

// URL API Backend
const API_URL = '/api';

// Handle Submit Form Sign In (Login)
const signInForm = document.querySelector(".sign-in-form");
signInForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const usernameInput = signInForm.querySelector("input[type='text']");
  const passwordInput = signInForm.querySelector("input[type='password']");
  const loginBtn = signInForm.querySelector("input[type='submit']");
  
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  
  if (!username || !password) {
    Toast.warning("Harap isi username dan password!");
    return;
  }
  
  try {
    loginBtn.disabled = true;
    loginBtn.value = "Logging in...";
    
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || "Gagal melakukan login");
    }
    
    // Simpan token dan data user ke localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // Store welcome toast in sessionStorage to show after redirect loads
    sessionStorage.setItem('toastMessage', `Selamat datang kembali, ${data.user.username}!`);
    sessionStorage.setItem('toastType', 'success');
    
    // Redirect berdasarkan role
    if (data.user.role === 'admin') {
      window.location.href = '../admin/dashboard.html';
    } else {
      window.location.href = '../index.html';
    }
    
  } catch (error) {
    Toast.error(error.message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.value = "Login";
  }
});

// Handle Submit Form Sign Up (Registrasi)
const signUpForm = document.querySelector(".sign-up-form");
signUpForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const usernameInput = signUpForm.querySelector("input[type='text']");
  const passwordInput = signUpForm.querySelector("input[type='password']");
  const signUpBtn = signUpForm.querySelector("input[type='submit']");
  
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  
  if (!username || !password) {
    Toast.warning("Harap isi username dan password!");
    return;
  }
  
  try {
    signUpBtn.disabled = true;
    signUpBtn.value = "Signing up...";
    
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || "Gagal melakukan registrasi");
    }
    
    Toast.success("Registrasi berhasil! Silakan masuk menggunakan akun Anda.");
    
    // Reset form
    usernameInput.value = '';
    passwordInput.value = '';
    const emailInput = signUpForm.querySelector("input[type='email']");
    if (emailInput) emailInput.value = '';
    
    // Pindah ke form Sign In
    container.classList.remove("sign-up-mode");
    
  } catch (error) {
    Toast.error(error.message);
  } finally {
    signUpBtn.disabled = false;
    signUpBtn.value = "Sign up";
  }
});
