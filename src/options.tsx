import React, { useCallback, useState } from "react";

import { error, warn } from "~util/logger";
import {
  addBoycottList,
  exportBoycottListsToJSON,
  getBoycottLists,
  getUserPreferences,
  importBoycottListsFromJSON,
  removeAllBoycottLists,
  removeBoycottList,
  updateBoycottListDetails,
  updateUserPreferences
} from "~util/storage";
import type { BoycottList, Filter, UserPreferences } from "~util/types";

import styles from "./options.module.css";

function OptionsIndex() {
  const [lists, setLists] = useState<BoycottList[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingList, setEditingList] = useState<BoycottList | null>(null);
  const [addingNewList, setAddingNewList] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<Partial<BoycottList>>({});
  const [editingItem, setEditingItem] = useState<{
    type: "brand" | "domain";
    index: number;
    item: Filter;
  } | null>(null);
  const [newItem, setNewItem] = useState<{
    type: "brand" | "domain";
    item: Filter;
  } | null>(null);
  const fileInputRef = React.createRef<HTMLInputElement>();

  const loadLists = useCallback(async () => {
    try {
      const boycottLists = await getBoycottLists();
      setLists(boycottLists);
    } catch (err) {
      error("Error loading lists:", err);
      setErrorMessage("Failed to load boycott lists");
    }
  }, []);

  const loadPreferences = useCallback(async () => {
    try {
      const userPreferences = await getUserPreferences();
      setPreferences(userPreferences);
    } catch (err) {
      error("Error loading preferences:", err);
      setErrorMessage("Failed to load preferences");
    }
  }, []);

  React.useEffect(() => {
    loadLists();
    loadPreferences();
  }, [loadLists, loadPreferences]);

  const handlePreferencesChange = async (updates: Partial<UserPreferences>) => {
    if (!preferences) return;

    try {
      const newPreferences = { ...preferences, ...updates };
      await updateUserPreferences(newPreferences);
      setPreferences(newPreferences);
      setErrorMessage(null);
    } catch (err) {
      error("Error updating preferences:", err);
      setErrorMessage("Failed to update preferences");
    }
  };

  const handleImportList = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      try {
        const fileContent = await selectedFile.text();
        await importBoycottListsFromJSON(fileContent);
        await loadLists();
        setErrorMessage(null);
      } catch (err) {
        error("Error importing lists:", err);
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Failed to import list. Invalid format."
        );
      }
    } else {
      warn("No file selected");
    }
  };

  const handleExportLists = async () => {
    try {
      const jsonExport = await exportBoycottListsToJSON();
      const blob = new Blob([jsonExport], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "boycott-lists.json";
      a.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      error("Error exporting lists:", err);
      setErrorMessage("Failed to export lists");
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm("Are you sure you want to delete this list?")) return;

    try {
      await removeBoycottList(listId);
      await loadLists();
    } catch (err) {
      error("Error deleting list:", err);
      setErrorMessage("Failed to delete list");
    }
  };

  const handleRemoveAllLists = async () => {
    if (
      !confirm(
        "Are you sure you want to remove all boycott lists? This action cannot be undone."
      )
    )
      return;

    try {
      await removeAllBoycottLists();
      await loadLists();
      setErrorMessage(null);
    } catch (err) {
      error("Error removing all lists:", err);
      setErrorMessage("Failed to remove all lists");
    }
  };

  const handleEditList = (list: BoycottList) => {
    setEditingList(list);
    setEditForm({
      name: list.name,
      description: list.description,
      url: list.url,
      brands: [...list.brands],
      domains: [...list.domains]
    });
    setAddingNewList(false);
  };

  const handleAddNewList = () => {
    setAddingNewList(true);
    setEditingList(null);
    setEditForm({
      name: "",
      description: "",
      url: "",
      brands: [],
      domains: []
    });
  };

  const handleSaveEdit = async () => {
    if (!editingList && !addingNewList) return;

    try {
      if (addingNewList) {
        const newList: BoycottList = {
          id: crypto.randomUUID(),
          name: editForm.name || "New Boycott List",
          description: editForm.description || "",
          url: editForm.url,
          brands: editForm.brands || [],
          domains: editForm.domains || [],
          lastUpdated: new Date().toISOString()
        };
        await addBoycottList(newList);
      } else if (editingList) {
        await updateBoycottListDetails(editingList.id, editForm);
      }

      await loadLists();
      setEditingList(null);
      setAddingNewList(false);
      setEditForm({});
    } catch (err) {
      error("Error saving list:", err);
      setErrorMessage("Failed to save boycott list");
    }
  };

  const handleCancelEdit = () => {
    setEditingList(null);
    setAddingNewList(false);
    setEditForm({});
  };

  const handleEditItem = (
    type: "brand" | "domain",
    index: number,
    item: Filter
  ) => {
    setEditingItem({ type, index, item: { ...item } });
  };

  const handleSaveItem = () => {
    if (!editingItem) return;

    const { type, index, item } = editingItem;
    const newItems = [
      ...(editForm[type === "brand" ? "brands" : "domains"] || [])
    ];
    newItems[index] = { ...item };
    setEditForm({
      ...editForm,
      [type === "brand" ? "brands" : "domains"]: newItems
    });
    setEditingItem(null);
  };

  const handleCancelItem = () => {
    setEditingItem(null);
  };

  const handleAddItem = (type: "brand" | "domain") => {
    setNewItem({
      type,
      item: { rule: "", reason: "", url: "" }
    });
  };

  const handleSaveNewItem = () => {
    if (!newItem) return;

    const { type, item } = newItem;
    const currentItems =
      editForm[type === "brand" ? "brands" : "domains"] || [];
    setEditForm({
      ...editForm,
      [type === "brand" ? "brands" : "domains"]: [...currentItems, { ...item }]
    });
    setNewItem(null);
  };

  const handleCancelNewItem = () => {
    setNewItem(null);
  };

  const handleDeleteItem = (type: "brand" | "domain", index: number) => {
    const currentItems =
      editForm[type === "brand" ? "brands" : "domains"] || [];
    const newItems = [...currentItems];
    newItems.splice(index, 1);
    setEditForm({
      ...editForm,
      [type === "brand" ? "brands" : "domains"]: newItems
    });
  };

  const handleItemChange = (item: Filter) => {
    if (editingItem) {
      setEditingItem({ ...editingItem, item });
    } else if (newItem) {
      setNewItem({ ...newItem, item });
    }
  };

  const renderItemForm = (item: Filter, onChange: (item: Filter) => void) => (
    <div className={styles.itemForm}>
      <div className={styles.formGroup}>
        <label>Rule</label>
        <input
          type="text"
          value={item.rule}
          onChange={(e) => onChange({ ...item, rule: e.target.value })}
          className={styles.input}
          placeholder="Enter rule"
        />
      </div>
      <div className={styles.formGroup}>
        <label>Reason</label>
        <input
          type="text"
          value={item.reason}
          onChange={(e) => onChange({ ...item, reason: e.target.value })}
          className={styles.input}
          placeholder="Enter reason"
        />
      </div>
      <div className={styles.formGroup}>
        <label>URL</label>
        <input
          type="url"
          value={item.url}
          onChange={(e) => onChange({ ...item, url: e.target.value })}
          className={styles.input}
          placeholder="https://example.com"
        />
      </div>
    </div>
  );

  const renderEditForm = () => {
    if (!editingList && !addingNewList) return null;

    const formTitle = addingNewList ? "Create New List" : "Edit List";

    return (
      <div className={styles.editForm}>
        <h3>{formTitle}</h3>
        <div className={styles.formGroup}>
          <label>Name</label>
          <input
            type="text"
            value={editForm.name || ""}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            className={styles.input}
            placeholder="Enter list name"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Description</label>
          <textarea
            value={editForm.description || ""}
            onChange={(e) =>
              setEditForm({
                ...editForm,
                description: e.target.value
              })
            }
            className={styles.input}
            placeholder="Enter list description"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Campaign URL</label>
          <input
            type="url"
            value={editForm.url || ""}
            onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
            className={styles.input}
            placeholder="https://example.com/campaign"
          />
        </div>

        <div className={styles.itemsSection}>
          <div className={styles.itemsHeader}>
            <h4>Brands</h4>
            <button
              onClick={() => handleAddItem("brand")}
              className={`${styles.btn} ${styles.btnOutline}`}>
              Add Brand
            </button>
          </div>
          {newItem?.type === "brand" && (
            <div className={styles.newItemForm}>
              {renderItemForm(newItem.item, handleItemChange)}
              <div className={styles.formActions}>
                <button onClick={handleSaveNewItem} className={styles.btn}>
                  Save
                </button>
                <button
                  onClick={handleCancelNewItem}
                  className={`${styles.btn} ${styles.btnOutline}`}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          <div className={styles.itemsList}>
            {(editForm.brands || []).map((brand, index) => (
              <div key={index} className={styles.itemCard}>
                {editingItem?.type === "brand" &&
                editingItem.index === index ? (
                  <>
                    {renderItemForm(editingItem.item, handleItemChange)}
                    <div className={styles.formActions}>
                      <button onClick={handleSaveItem} className={styles.btn}>
                        Save
                      </button>
                      <button
                        onClick={handleCancelItem}
                        className={`${styles.btn} ${styles.btnOutline}`}>
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.itemContent}>
                      <div className={styles.itemRule}>{brand.rule}</div>
                      {brand.reason && (
                        <div className={styles.itemReason}>{brand.reason}</div>
                      )}
                      {brand.url && (
                        <a
                          href={brand.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.link}>
                          Learn more
                        </a>
                      )}
                    </div>
                    <div className={styles.itemActions}>
                      <button
                        onClick={() => handleEditItem("brand", index, brand)}
                        className={`${styles.btn} ${styles.btnOutline}`}>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem("brand", index)}
                        className={`${styles.btn} ${styles.btnDanger}`}>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.itemsSection}>
          <div className={styles.itemsHeader}>
            <h4>Domains</h4>
            <button
              onClick={() => handleAddItem("domain")}
              className={`${styles.btn} ${styles.btnOutline}`}>
              Add Domain
            </button>
          </div>
          {newItem?.type === "domain" && (
            <div className={styles.newItemForm}>
              {renderItemForm(newItem.item, handleItemChange)}
              <div className={styles.formActions}>
                <button onClick={handleSaveNewItem} className={styles.btn}>
                  Save
                </button>
                <button
                  onClick={handleCancelNewItem}
                  className={`${styles.btn} ${styles.btnOutline}`}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          <div className={styles.itemsList}>
            {(editForm.domains || []).map((domain, index) => (
              <div key={index} className={styles.itemCard}>
                {editingItem?.type === "domain" &&
                editingItem.index === index ? (
                  <>
                    {renderItemForm(editingItem.item, handleItemChange)}
                    <div className={styles.formActions}>
                      <button onClick={handleSaveItem} className={styles.btn}>
                        Save
                      </button>
                      <button
                        onClick={handleCancelItem}
                        className={`${styles.btn} ${styles.btnOutline}`}>
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.itemContent}>
                      <div className={styles.itemRule}>{domain.rule}</div>
                      {domain.reason && (
                        <div className={styles.itemReason}>{domain.reason}</div>
                      )}
                      {domain.url && (
                        <a
                          href={domain.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.link}>
                          Learn more
                        </a>
                      )}
                    </div>
                    <div className={styles.itemActions}>
                      <button
                        onClick={() => handleEditItem("domain", index, domain)}
                        className={`${styles.btn} ${styles.btnOutline}`}>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem("domain", index)}
                        className={`${styles.btn} ${styles.btnDanger}`}>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.formActions}>
          <button onClick={handleSaveEdit} className={styles.btn}>
            {addingNewList ? "Create List" : "Save Changes"}
          </button>
          <button
            onClick={handleCancelEdit}
            className={`${styles.btn} ${styles.btnOutline}`}>
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const renderLists = () => {
    if (lists.length === 0) {
      return (
        <div className={styles.emptyState}>
          <p>No boycott lists available.</p>
          <p>
            Create a new list or import an existing one using the buttons above.
          </p>
        </div>
      );
    }

    return (
      <div className={styles.listContainer}>
        {lists.map((list, index) => (
          <div key={list.id || index} className={styles.listItem}>
            <div className={styles.listInfo}>
              <div className={styles.listTitle}>{list.name}</div>
              <div className={styles.listDescription}>{list.description}</div>
              <div className={styles.listMeta}>
                <span>
                  Last updated: {new Date(list.lastUpdated).toLocaleString()}
                </span>
                <span>{list.brands?.length || 0} brands</span>
                <span>{list.domains?.length || 0} domains</span>
              </div>
              <div className={styles.listDetails}>
                <div className={styles.detailSection}>
                  <h4>Brands</h4>
                  <ul>
                    {list.brands.map((brand, i) => (
                      <li key={i}>
                        {brand.rule}
                        {brand.reason && (
                          <span className={styles.reason}>
                            {" "}
                            - {brand.reason}
                          </span>
                        )}
                        {brand.url && (
                          <a
                            href={brand.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.link}>
                            Learn more
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={styles.detailSection}>
                  <h4>Domains</h4>
                  <ul>
                    {list.domains.map((domain, i) => (
                      <li key={i}>
                        {domain.rule}
                        {domain.reason && (
                          <span className={styles.reason}>
                            {" "}
                            - {domain.reason}
                          </span>
                        )}
                        {domain.url && (
                          <a
                            href={domain.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.link}>
                            Learn more
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className={styles.listActions}>
              <button
                onClick={() => handleEditList(list)}
                className={`${styles.btn} ${styles.btnOutline}`}
                title="Edit list">
                Edit
              </button>
              <button
                onClick={() => handleDeleteList(list.id)}
                className={`${styles.btn} ${styles.btnDanger}`}
                title="Delete list">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPreferences = () => (
    <section className={styles.section}>
      <h2>Preferences</h2>
      <div className={styles.preferences}>
        <div className={styles.formGroup}>
          <label>Auto-update Lists</label>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={preferences?.autoUpdate || false}
              onChange={(e) =>
                handlePreferencesChange({
                  autoUpdate: e.target.checked
                })
              }
            />
            <span className={styles.slider}></span>
          </label>
        </div>
        {preferences?.autoUpdate && (
          <div className={styles.formGroup}>
            <label>Update interval (hours)</label>
            <select
              value={preferences.updateInterval}
              onChange={(e) =>
                handlePreferencesChange({
                  updateInterval: parseInt(e.target.value)
                })
              }
              className={styles.input}>
              <option value={6}>Every 6 hours</option>
              <option value={12}>Every 12 hours</option>
              <option value={24}>Every 24 hours</option>
              <option value={48}>Every 48 hours</option>
              <option value={168}>Every week</option>
            </select>
          </div>
        )}
        <div className={styles.formGroup}>
          <label>List Import URLs</label>
          <div className={styles.importUrls}>
            {preferences?.importUrls.map((url) => (
              <div key={url} className={styles.importUrlItem}>
                <span>{url}</span>
                <button
                  onClick={() =>
                    handlePreferencesChange({
                      importUrls: preferences.importUrls.filter(
                        (u) => u !== url
                      )
                    })
                  }
                  className={`${styles.btn} ${styles.btnDanger}`}>
                  Remove
                </button>
              </div>
            ))}
            <div className={styles.addUrlForm}>
              <input
                type="text"
                placeholder="Add new URL"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    const input = e.target as HTMLInputElement;
                    handlePreferencesChange({
                      importUrls: [
                        ...(preferences?.importUrls || []),
                        input.value
                      ]
                    });
                    input.value = "";
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Boykot Penguen Options</h1>
      </header>

      {errorMessage && (
        <div className={styles.errorMessage}>{errorMessage}</div>
      )}

      {renderPreferences()}

      <section className={styles.section}>
        <h2>Boycott Lists</h2>
        <div className={styles.actions}>
          <button onClick={handleAddNewList} className={styles.btn}>
            Create New List
          </button>
          <button onClick={handleImportList} className={styles.btn}>
            Import List
          </button>
          <input
            type="file"
            hidden
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".json"
          />
          <button
            onClick={handleExportLists}
            className={`${styles.btn} ${styles.btnOutline}`}>
            Export Lists
          </button>
          <button
            onClick={handleRemoveAllLists}
            className={`${styles.btn} ${styles.btnDanger}`}>
            Remove All Lists
          </button>
        </div>
        {editingList || addingNewList ? renderEditForm() : renderLists()}
      </section>
    </div>
  );
}

export default OptionsIndex;
