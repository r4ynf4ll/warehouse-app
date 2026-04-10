const state = {
	inventory: [],
	filtered: [],
	sortBy: "id",
	sortDir: "asc",
	deletingIds: new Set(),
	formMode: "create",
	editingId: null,
	isSubmittingForm: false,
	isRegistering: false,
	isLoggingIn: false,
	currentUser: null,
	isAuthenticated: false,
};

const refs = {
	tableBody: document.getElementById("inventory-table-body"),
	tableMessage: document.getElementById("table-message"),
	apiStatus: document.getElementById("api-status"),
	searchInput: document.getElementById("search-input"),
	categoryFilter: document.getElementById("category-filter"),
	registerForm: document.getElementById("register-form"),
	registerUsername: document.getElementById("register-username"),
	registerPassword: document.getElementById("register-password"),
	registerPasswordConfirm: document.getElementById("register-password-confirm"),
	registerSubmit: document.getElementById("register-submit"),
	registerMessage: document.getElementById("register-message"),
	loginForm: document.getElementById("login-form"),
	loginUsername: document.getElementById("login-username"),
	loginPassword: document.getElementById("login-password"),
	loginSubmit: document.getElementById("login-submit"),
	loginMessage: document.getElementById("login-message"),
	authStatus: document.getElementById("auth-status"),
	logoutBtn: document.getElementById("logout-btn"),
	addBtn: document.getElementById("add-btn"),
	refreshBtn: document.getElementById("refresh-btn"),
	formPanel: document.getElementById("inventory-form-panel"),
	form: document.getElementById("inventory-form"),
	formTitle: document.getElementById("inventory-form-title"),
	formEyebrow: document.getElementById("inventory-form-eyebrow"),
	formCancel: document.getElementById("inventory-form-cancel"),
	formSubmit: document.getElementById("inventory-form-submit"),
	formReset: document.getElementById("inventory-form-reset"),
	formError: document.getElementById("inventory-form-error"),
	formProductName: document.getElementById("form-product-name"),
	formCategory: document.getElementById("form-category"),
	formQuantity: document.getElementById("form-quantity"),
	formPrice: document.getElementById("form-price"),
	formSupplier: document.getElementById("form-supplier"),
	totalItems: document.getElementById("total-items"),
	totalQty: document.getElementById("total-qty"),
	lowStock: document.getElementById("low-stock"),
	inventoryValue: document.getElementById("inventory-value"),
	sortableHeaders: document.querySelectorAll("th[data-sort]"),
};

function money(value) {
	return `$${Number(value || 0).toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

function toSafeNumber(value) {
	const num = Number(value);
	return Number.isFinite(num) ? num : 0;
}

function setFormError(message) {
	refs.formError.textContent = message;
}

function setRegisterMessage(message, tone) {
	refs.registerMessage.textContent = message;
	refs.registerMessage.dataset.tone = tone || "neutral";
}

function setLoginMessage(message, tone) {
	refs.loginMessage.textContent = message;
	refs.loginMessage.dataset.tone = tone || "neutral";
}

function setAuthStatus(message, tone) {
	refs.authStatus.textContent = message;
	refs.authStatus.dataset.tone = tone || "neutral";
}

function setAuthenticated(isAuthenticated, username = null) {
	state.isAuthenticated = isAuthenticated;
	state.currentUser = isAuthenticated ? username : null;
	refs.addBtn.disabled = !isAuthenticated || state.isSubmittingForm;
	refs.refreshBtn.disabled = !isAuthenticated;
	refs.logoutBtn.disabled = !isAuthenticated;
	if (!isAuthenticated) {
		setAuthStatus("Not signed in", "neutral");
	} else if (username) {
		setAuthStatus(`Signed in as ${username}`, "ok");
	}
}

function clearInventoryView(message = "Sign in to view inventory.") {
	state.inventory = [];
	state.filtered = [];
	refs.tableBody.innerHTML = "";
	refs.tableMessage.textContent = message;
	updateStats([]);
	buildCategoryFilter([]);
}

function setRegisterSubmitting(isSubmitting) {
	state.isRegistering = isSubmitting;
	refs.registerSubmit.disabled = isSubmitting;
	refs.registerUsername.disabled = isSubmitting;
	refs.registerPassword.disabled = isSubmitting;
	refs.registerPasswordConfirm.disabled = isSubmitting;
}

function setLoginSubmitting(isSubmitting) {
	state.isLoggingIn = isSubmitting;
	refs.loginSubmit.disabled = isSubmitting;
	refs.loginUsername.disabled = isSubmitting;
	refs.loginPassword.disabled = isSubmitting;
}

function getRegisterPayload() {
	const username = refs.registerUsername.value.trim();
	const password = refs.registerPassword.value;
	const passwordConfirm = refs.registerPasswordConfirm.value;

	if (!username || !password || !passwordConfirm) {
		setRegisterMessage("Username and password are required.", "error");
		return null;
	}

	if (password.length < 6) {
		setRegisterMessage("Password must be at least 6 characters.", "error");
		return null;
	}

	if (password !== passwordConfirm) {
		setRegisterMessage("Passwords do not match.", "error");
		return null;
	}

	setRegisterMessage("", "neutral");
	return {
		username,
		password,
	};
}

function getLoginPayload() {
	const username = refs.loginUsername.value.trim();
	const password = refs.loginPassword.value;

	if (!username || !password) {
		setLoginMessage("Username and password are required.", "error");
		return null;
	}

	setLoginMessage("", "neutral");
	return {
		username,
		password,
	};
}

async function handleRegisterSubmit(event) {
	event.preventDefault();
	if (state.isRegistering) {
		return;
	}

	const payload = getRegisterPayload();
	if (!payload) {
		return;
	}

	setRegisterSubmitting(true);
	setRegisterMessage("Creating account...", "neutral");

	try {
		const response = await fetch("/register", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			let detail = "Registration failed.";
			try {
				const errorPayload = await response.json();
				if (errorPayload && typeof errorPayload.detail === "string") {
					detail = errorPayload.detail;
				}
			} catch {
				// Keep fallback detail when response body is not JSON.
			}
			throw new Error(detail);
		}

		const createdUser = await response.json();
		setRegisterMessage(`Registered user: ${createdUser.username}`, "ok");
		refs.registerForm.reset();
	} catch (error) {
		const message = error instanceof Error ? error.message : "Registration failed.";
		setRegisterMessage(message, "error");
		console.error("Register error:", error);
	} finally {
		setRegisterSubmitting(false);
	}
}

async function handleLoginSubmit(event) {
	event.preventDefault();
	if (state.isLoggingIn) {
		return;
	}

	const payload = getLoginPayload();
	if (!payload) {
		return;
	}

	setLoginSubmitting(true);
	setLoginMessage("Signing in...", "neutral");

	try {
		const response = await fetch("/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			let detail = "Login failed.";
			try {
				const errorPayload = await response.json();
				if (errorPayload && typeof errorPayload.detail === "string") {
					detail = errorPayload.detail;
				}
			} catch {
				// Keep fallback detail when response body is not JSON.
			}
			throw new Error(detail);
		}

		const loggedInUser = await response.json();
		setAuthenticated(true, loggedInUser.username);
		setLoginMessage(loggedInUser.message || `Signed in as ${loggedInUser.username}`, "ok");
		refs.loginForm.reset();
		await loadInventory();
	} catch (error) {
		const message = error instanceof Error ? error.message : "Login failed.";
		setLoginMessage(message, "error");
		setAuthenticated(false);
		console.error("Login error:", error);
	} finally {
		setLoginSubmitting(false);
	}
}

async function handleLogout() {
	if (!state.isAuthenticated) {
		return;
	}

	refs.logoutBtn.disabled = true;
	setStatus("Signing out", "neutral");

	try {
		const response = await fetch("/logout", {
			method: "POST",
		});

		if (!response.ok) {
			throw new Error(`Logout failed: ${response.status}`);
		}

		setAuthenticated(false);
		setLoginMessage("", "neutral");
		clearInventoryView();
		setStatus("Signed out", "neutral");
	} catch (error) {
		setStatus("Logout failed. Try again.", "error");
		setAuthenticated(true, state.currentUser);
		console.error("Logout error:", error);
	}
}

function setFormSubmitting(isSubmitting) {
	state.isSubmittingForm = isSubmitting;
	refs.formSubmit.disabled = isSubmitting;
	refs.formCancel.disabled = isSubmitting;
	refs.formReset.disabled = isSubmitting;
	refs.formProductName.disabled = isSubmitting;
	refs.formCategory.disabled = isSubmitting;
	refs.formQuantity.disabled = isSubmitting;
	refs.formPrice.disabled = isSubmitting;
	refs.formSupplier.disabled = isSubmitting;
	refs.addBtn.disabled = isSubmitting;
}

function resetFormFields() {
	refs.form.reset();
	refs.formQuantity.value = "0";
	refs.formPrice.value = "0.00";
	setFormError("");
}

function openForm(mode, item = null) {
	state.formMode = mode;
	state.editingId = mode === "edit" && item ? toSafeNumber(item.id) : null;
	refs.formPanel.hidden = false;
	setFormError("");

	if (mode === "edit" && item) {
		refs.formEyebrow.textContent = "Inventory Form - Edit Mode";
		refs.formTitle.textContent = `Edit Inventory Item #${item.id}`;
		refs.formSubmit.textContent = "Save Changes";
		refs.formProductName.value = item.product_name ?? "";
		refs.formCategory.value = item.category ?? "";
		refs.formQuantity.value = String(toSafeNumber(item.quantity));
		refs.formPrice.value = String(toSafeNumber(item.price));
		refs.formSupplier.value = item.supplier ?? "";
	} else {
		refs.formEyebrow.textContent = "Inventory Form - Create Mode";
		refs.formTitle.textContent = "Add Inventory Item";
		refs.formSubmit.textContent = "Save Item";
		resetFormFields();
	}

	refs.formProductName.focus();
	refs.formPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeForm() {
	refs.formPanel.hidden = true;
	state.editingId = null;
	state.formMode = "create";
	setFormError("");
	setFormSubmitting(false);
}

function getPayloadFromForm() {
	const productName = refs.formProductName.value.trim();
	const category = refs.formCategory.value.trim();
	const quantityRaw = refs.formQuantity.value.trim();
	const priceRaw = refs.formPrice.value.trim();
	const supplier = refs.formSupplier.value.trim();

	if (!productName || !category) {
		setFormError("Product name and category are required.");
		return null;
	}

	const quantity = Number(quantityRaw);
	if (!Number.isInteger(quantity) || quantity < 0) {
		setFormError("Quantity must be a whole number greater than or equal to 0.");
		return null;
	}

	const price = Number(priceRaw);
	if (!Number.isFinite(price) || price < 0) {
		setFormError("Price must be a number greater than or equal to 0.");
		return null;
	}

	setFormError("");
	return {
		product_name: productName,
		category,
		quantity,
		price,
		supplier: supplier || null,
	};
}

function setStatus(label, tone) {
	refs.apiStatus.textContent = label;
	refs.apiStatus.style.color = tone === "error" ? "#bf4f2a" : tone === "ok" ? "#24633d" : "#4f6068";
	refs.apiStatus.style.borderColor = tone === "error" ? "#e0a896" : tone === "ok" ? "#99c2a8" : "#d9d2c3";
}

function buildCategoryFilter(items) {
	const categories = [...new Set(items.map((item) => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
	refs.categoryFilter.innerHTML = '<option value="all">All</option>';
	for (const category of categories) {
		const option = document.createElement("option");
		option.value = category;
		option.textContent = category;
		refs.categoryFilter.appendChild(option);
	}
}

function updateStats(items) {
	const totalItems = items.length;
	const totalQty = items.reduce((sum, item) => sum + toSafeNumber(item.quantity), 0);
	const lowStock = items.filter((item) => toSafeNumber(item.quantity) < 20).length;
	const totalValue = items.reduce(
		(sum, item) => sum + toSafeNumber(item.quantity) * toSafeNumber(item.price),
		0
	);

	refs.totalItems.textContent = String(totalItems);
	refs.totalQty.textContent = totalQty.toLocaleString();
	refs.lowStock.textContent = String(lowStock);
	refs.inventoryValue.textContent = money(totalValue);
}

function applySort(items) {
	const sorted = [...items];
	sorted.sort((a, b) => {
		const aValue = a[state.sortBy] ?? "";
		const bValue = b[state.sortBy] ?? "";

		const aNum = Number(aValue);
		const bNum = Number(bValue);
		if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
			return state.sortDir === "asc" ? aNum - bNum : bNum - aNum;
		}

		const cmp = String(aValue).localeCompare(String(bValue));
		return state.sortDir === "asc" ? cmp : -cmp;
	});
	return sorted;
}

function applyFilters() {
	const searchTerm = refs.searchInput.value.trim().toLowerCase();
	const selectedCategory = refs.categoryFilter.value;

	const filtered = state.inventory.filter((item) => {
		const categoryMatch = selectedCategory === "all" || item.category === selectedCategory;
		if (!categoryMatch) {
			return false;
		}

		if (!searchTerm) {
			return true;
		}

		const haystack = [item.product_name, item.category, item.supplier, String(item.id)]
			.join(" ")
			.toLowerCase();

		return haystack.includes(searchTerm);
	});

	state.filtered = applySort(filtered);
	renderTable();
}

function renderTable() {
	refs.tableBody.innerHTML = "";

	if (!state.filtered.length) {
		refs.tableMessage.textContent = "No rows match your filters.";
		return;
	}

	refs.tableMessage.textContent = `${state.filtered.length} row(s) loaded`;

	for (const row of state.filtered) {
		const rowId = toSafeNumber(row.id);
		const isDeleting = state.deletingIds.has(rowId);
		const tr = document.createElement("tr");
		tr.innerHTML = `
			<td>${row.id ?? ""}</td>
			<td>${row.product_name ?? ""}</td>
			<td>${row.category ?? ""}</td>
			<td>${toSafeNumber(row.quantity).toLocaleString()}</td>
			<td>${money(row.price)}</td>
			<td>${row.supplier ?? "-"}</td>
			<td class="row-actions">
				<button class="edit-btn" type="button" data-edit-id="${rowId}">
					Edit
				</button>
				<button class="danger-btn" type="button" data-delete-id="${rowId}" ${isDeleting ? "disabled" : ""}>
					${isDeleting ? "Deleting..." : "Delete"}
				</button>
			</td>
		`;
		refs.tableBody.appendChild(tr);
	}
}

async function createInventoryItem(payload) {
	if (!state.isAuthenticated) {
		setStatus("Sign in before creating inventory items.", "error");
		return;
	}

	setStatus("Creating inventory item", "neutral");
	setFormSubmitting(true);

	try {
		const response = await fetch("/inventory", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			throw new Error(`Create failed: ${response.status}`);
		}

		const created = await response.json();
		state.inventory = [...state.inventory, created];
		buildCategoryFilter(state.inventory);
		updateStats(state.inventory);
		setStatus(`Created item #${created.id}`, "ok");
		applyFilters();
		closeForm();
	} catch (error) {
		setFormError("Could not save new item. Please verify fields and try again.");
		setStatus("Create failed. Try again.", "error");
		console.error("Inventory create error:", error);
	} finally {
		setFormSubmitting(false);
	}
}

async function updateInventoryItem(id, payload) {
	if (!Number.isInteger(id) || id <= 0) {
		setStatus("Edit aborted: invalid item id", "error");
		return;
	}
	if (!state.isAuthenticated) {
		setStatus("Sign in before editing inventory items.", "error");
		return;
	}

	setStatus(`Updating item #${id}`, "neutral");
	setFormSubmitting(true);

	try {
		const response = await fetch(`/inventory/${id}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			throw new Error(`Update failed: ${response.status}`);
		}

		const updated = await response.json();
		state.inventory = state.inventory.map((item) =>
			toSafeNumber(item.id) === id ? updated : item
		);
		buildCategoryFilter(state.inventory);
		updateStats(state.inventory);
		setStatus(`Updated item #${id}`, "ok");
		applyFilters();
		closeForm();
	} catch (error) {
		setFormError("Could not update item. Please verify fields and try again.");
		setStatus("Update failed. Try again.", "error");
		console.error("Inventory update error:", error);
	} finally {
		setFormSubmitting(false);
	}
}

async function handleFormSubmit(event) {
	event.preventDefault();
	if (state.isSubmittingForm) {
		return;
	}

	const payload = getPayloadFromForm();
	if (!payload) {
		return;
	}

	if (state.formMode === "edit") {
		if (!Number.isInteger(state.editingId) || state.editingId <= 0) {
			setFormError("Edit mode lost selected record. Please retry.");
			return;
		}
		await updateInventoryItem(state.editingId, payload);
		return;
	}

	await createInventoryItem(payload);
}

async function deleteInventoryItem(id) {
	if (!Number.isInteger(id) || id <= 0) {
		setStatus("Delete aborted: invalid item id", "error");
		return;
	}
	if (!state.isAuthenticated) {
		setStatus("Sign in before deleting inventory items.", "error");
		return;
	}

	const confirmed = window.confirm(`Delete inventory item #${id}? This cannot be undone.`);
	if (!confirmed) {
		return;
	}

	state.deletingIds.add(id);
	setStatus(`Deleting item #${id}`, "neutral");
	applyFilters();

	try {
		const response = await fetch(`/inventory/${id}`, {
			method: "DELETE",
		});

		if (!response.ok) {
			throw new Error(`Delete failed: ${response.status}`);
		}

		state.inventory = state.inventory.filter((item) => toSafeNumber(item.id) !== id);
		updateStats(state.inventory);
		setStatus(`Deleted item #${id}`, "ok");
		applyFilters();
	} catch (error) {
		setStatus("Delete failed. Try again.", "error");
		console.error("Inventory delete error:", error);
		applyFilters();
	} finally {
		state.deletingIds.delete(id);
		applyFilters();
	}
}

async function loadInventory() {
	if (!state.isAuthenticated) {
		clearInventoryView();
		setStatus("Sign in to load inventory", "neutral");
		return;
	}

	refs.tableMessage.textContent = "Loading inventory...";
	refs.refreshBtn.disabled = true;
	setStatus("Loading /inventory", "neutral");

	try {
		const response = await fetch("/inventory");
		if (response.status === 401) {
			setAuthenticated(false);
			clearInventoryView();
			setStatus("Session expired. Sign in again.", "error");
			return;
		}
		if (!response.ok) {
			throw new Error(`Request failed: ${response.status}`);
		}

		const data = await response.json();
		state.inventory = Array.isArray(data) ? data : [];
		buildCategoryFilter(state.inventory);
		updateStats(state.inventory);
		setStatus(`Connected - ${state.inventory.length} records`, "ok");
		applyFilters();
	} catch (error) {
		clearInventoryView("Could not load inventory. Check backend and retry.");
		setStatus("API error", "error");
		console.error("Inventory load error:", error);
	} finally {
		refs.refreshBtn.disabled = !state.isAuthenticated;
	}
}

function wireEvents() {
	refs.registerForm.addEventListener("submit", (event) => {
		void handleRegisterSubmit(event);
	});
	refs.loginForm.addEventListener("submit", (event) => {
		void handleLoginSubmit(event);
	});
	refs.logoutBtn.addEventListener("click", () => {
		void handleLogout();
	});
	refs.searchInput.addEventListener("input", applyFilters);
	refs.categoryFilter.addEventListener("change", applyFilters);
	refs.addBtn.addEventListener("click", () => {
		openForm("create");
	});
	refs.form.addEventListener("submit", (event) => {
		void handleFormSubmit(event);
	});
	refs.formCancel.addEventListener("click", closeForm);
	refs.formReset.addEventListener("click", () => {
		if (state.formMode === "edit") {
			const existing = state.inventory.find((item) => toSafeNumber(item.id) === state.editingId);
			if (existing) {
				openForm("edit", existing);
				return;
			}
		}
		resetFormFields();
	});
	refs.refreshBtn.addEventListener("click", loadInventory);
	refs.tableBody.addEventListener("click", (event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) {
			return;
		}

		const editButton = target.closest("button[data-edit-id]");
		if (editButton instanceof HTMLButtonElement) {
			const id = Number(editButton.dataset.editId);
			const existing = state.inventory.find((item) => toSafeNumber(item.id) === id);
			if (!existing) {
				setStatus(`Could not find item #${id} in current table view.`, "error");
				return;
			}
			openForm("edit", existing);
			return;
		}

		const deleteButton = target.closest("button[data-delete-id]");
		if (!(deleteButton instanceof HTMLButtonElement)) {
			return;
		}

		const id = Number(deleteButton.dataset.deleteId);
		void deleteInventoryItem(id);
	});

	for (const header of refs.sortableHeaders) {
		header.addEventListener("click", () => {
setAuthenticated(false);
clearInventoryView();
setStatus("Sign in to load inventory", "neutral");
void loadInventory();
			if (!newSort) {
				return;
			}

			if (state.sortBy === newSort) {
				state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
			} else {
				state.sortBy = newSort;
				state.sortDir = "asc";
			}

			applyFilters();
		});
	}
}

wireEvents();
loadInventory();
