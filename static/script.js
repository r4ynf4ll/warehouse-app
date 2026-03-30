const state = {
	inventory: [],
	filtered: [],
	sortBy: "id",
	sortDir: "asc",
	deletingIds: new Set(),
};

const refs = {
	tableBody: document.getElementById("inventory-table-body"),
	tableMessage: document.getElementById("table-message"),
	apiStatus: document.getElementById("api-status"),
	searchInput: document.getElementById("search-input"),
	categoryFilter: document.getElementById("category-filter"),
	refreshBtn: document.getElementById("refresh-btn"),
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
				<button class="danger-btn" type="button" data-delete-id="${rowId}" ${isDeleting ? "disabled" : ""}>
					${isDeleting ? "Deleting..." : "Delete"}
				</button>
			</td>
		`;
		refs.tableBody.appendChild(tr);
	}
}

async function deleteInventoryItem(id) {
	if (!Number.isInteger(id) || id <= 0) {
		setStatus("Delete aborted: invalid item id", "error");
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
	refs.tableMessage.textContent = "Loading inventory...";
	refs.refreshBtn.disabled = true;
	setStatus("Loading /inventory", "neutral");

	try {
		const response = await fetch("/inventory");
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
		state.inventory = [];
		state.filtered = [];
		refs.tableBody.innerHTML = "";
		refs.tableMessage.textContent = "Could not load inventory. Check backend and retry.";
		updateStats([]);
		setStatus("API error", "error");
		console.error("Inventory load error:", error);
	} finally {
		refs.refreshBtn.disabled = false;
	}
}

function wireEvents() {
	refs.searchInput.addEventListener("input", applyFilters);
	refs.categoryFilter.addEventListener("change", applyFilters);
	refs.refreshBtn.addEventListener("click", loadInventory);
	refs.tableBody.addEventListener("click", (event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) {
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
			const newSort = header.dataset.sort;
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
