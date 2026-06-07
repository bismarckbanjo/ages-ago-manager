import { useState, useEffect } from "react";
import { json } from "react-router";
import { authenticate } from "../shopify.server";
import {
  Card,
  Layout,
  Page,
  Button,
  TextField,
  Select,
  Stack,
  ResourceList,
  ResourceItem,
  Text,
  Badge,
  Modal,
  FormLayout,
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({});
};

export default function ProceduresPage() {
  const [procedures, setProcedures] = useState([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState(null);
  const [procedureName, setProcedureName] = useState("");
  const [filters, setFilters] = useState({
    productType: "",
    tags: "",
    vendor: "",
  });
  const [changes, setChanges] = useState({
    title: "",
    price: "",
    tags: "",
    vendor: "",
    descriptionHtml: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProcedures();
  }, []);

  const fetchProcedures = async () => {
    const res = await fetch("/api/procedures");
    const data = await res.json();
    setProcedures(data);
  };

  const handleSaveProcedure = async () => {
    if (!procedureName) {
      alert("Procedure name is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/procedures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: procedureName,
          filters,
          changes: Object.fromEntries(
            Object.entries(changes).filter(([_, v]) => v)
          ),
        }),
      });

      if (res.ok) {
        setProcedureName("");
        setFilters({ productType: "", tags: "", vendor: "" });
        setChanges({
          title: "",
          price: "",
          tags: "",
          vendor: "",
          descriptionHtml: "",
        });
        setShowBuilder(false);
        await fetchProcedures();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save procedure");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProcedure = async (id) => {
    if (confirm("Delete this procedure?")) {
      try {
        await fetch("/api/procedures", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        await fetchProcedures();
      } catch (err) {
        console.error(err);
        alert("Failed to delete procedure");
      }
    }
  };

  return (
    <Page
      title="Bulk Edit Procedures"
      primaryAction={
        <Button onClick={() => setShowBuilder(true)} variant="primary">
          New Procedure
        </Button>
      }
    >
      <Layout>
        <Layout.Section>
          {procedures.length === 0 ? (
            <Card>
              <Text as="p">No procedures yet. Create one to get started.</Text>
            </Card>
          ) : (
            <Card>
              <ResourceList
                resourceName={{ singular: "procedure", plural: "procedures" }}
                items={procedures}
                renderItem={(procedure) => (
                  <ResourceItem
                    id={procedure.id}
                    accessibilityLabel={`Procedure ${procedure.name}`}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <Text fontWeight="bold">{procedure.name}</Text>
                        <Text variant="bodySm" color="subdued">
                          {Object.keys(procedure.changes).join(", ")}
                        </Text>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <Button
                          onClick={() => {
                            setSelectedProcedure(procedure);
                            setShowBuilder(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          icon={DeleteIcon}
                          onClick={() => handleDeleteProcedure(procedure.id)}
                          destructive
                        />
                      </div>
                    </div>
                  </ResourceItem>
                )}
              />
            </Card>
          )}
        </Layout.Section>

        <Modal
          open={showBuilder}
          onClose={() => {
            setShowBuilder(false);
            setSelectedProcedure(null);
          }}
          title="Create Procedure"
          primaryAction={{
            content: "Save",
            onAction: handleSaveProcedure,
            loading,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => {
                setShowBuilder(false);
                setSelectedProcedure(null);
              },
            },
          ]}
        >
          <Modal.Section>
            <FormLayout>
              <TextField
                label="Procedure Name"
                value={procedureName}
                onChange={setProcedureName}
                placeholder="e.g., Summer Sale T-Shirts"
              />

              <Text variant="headingMd" as="h3">
                Filters (Find Products)
              </Text>
              <TextField
                label="Product Type"
                value={filters.productType}
                onChange={(val) =>
                  setFilters({ ...filters, productType: val })
                }
                placeholder="e.g., T-Shirt"
              />
              <TextField
                label="Tags (comma-separated)"
                value={filters.tags}
                onChange={(val) => setFilters({ ...filters, tags: val })}
                placeholder="e.g., summer, sale"
              />
              <TextField
                label="Vendor"
                value={filters.vendor}
                onChange={(val) => setFilters({ ...filters, vendor: val })}
                placeholder="e.g., Nike"
              />

              <Text variant="headingMd" as="h3">
                Changes (What to Update)
              </Text>
              <TextField
                label="Title"
                value={changes.title}
                onChange={(val) => setChanges({ ...changes, title: val })}
                placeholder="Leave blank to skip"
              />
              <TextField
                label="Price"
                value={changes.price}
                onChange={(val) => setChanges({ ...changes, price: val })}
                placeholder="Leave blank to skip"
              />
              <TextField
                label="Vendor"
                value={changes.vendor}
                onChange={(val) => setChanges({ ...changes, vendor: val })}
                placeholder="Leave blank to skip"
              />
              <TextField
                label="Tags (comma-separated)"
                value={changes.tags}
                onChange={(val) => setChanges({ ...changes, tags: val })}
                placeholder="Leave blank to skip"
              />
              <TextField
                label="Description (HTML)"
                value={changes.descriptionHtml}
                onChange={(val) =>
                  setChanges({ ...changes, descriptionHtml: val })
                }
                placeholder="Leave blank to skip"
                multiline={3}
              />
            </FormLayout>
          </Modal.Section>
        </Modal>
      </Layout>
    </Page>
  );
}
