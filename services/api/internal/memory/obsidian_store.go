package memory

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/talkgideon/api/internal/id"
)

// ObsidianStore persists memory items as Markdown files under a vault on disk:
//
//	<vault>/Gideon/Memories/<Type>/YYYY-MM-DD-slug-title.md
//
// It is the only component that touches the filesystem for memory.
type ObsidianStore struct {
	root string // vault root path
}

func NewObsidianStore(vaultPath string) (*ObsidianStore, error) {
	if vaultPath == "" {
		vaultPath = "./vault"
	}
	s := &ObsidianStore{root: vaultPath}
	if err := s.ensureDirs(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *ObsidianStore) base() string { return filepath.Join(s.root, "Gideon", "Memories") }

func (s *ObsidianStore) ensureDirs() error {
	for _, t := range []string{TypePreference, TypeProject, TypeDecision, TypeInstruction, TypeFact} {
		if err := os.MkdirAll(filepath.Join(s.base(), folderForType(t)), 0o755); err != nil {
			return err
		}
	}
	// Sibling folders referenced by the vault structure.
	for _, d := range []string{"Runs", "Sources"} {
		_ = os.MkdirAll(filepath.Join(s.root, "Gideon", d), 0o755)
	}
	return nil
}

func (s *ObsidianStore) filename(it Item) string {
	date := it.CreatedAt.UTC().Format("2006-01-02")
	slug := id.Slug(it.Title)
	if slug == "untitled" {
		slug = id.Slug(firstWords(it.Content, 6))
	}
	return fmt.Sprintf("%s-%s.md", date, slug)
}

// Save writes (or overwrites) the item's file and returns the stored item with
// its ObsidianPath populated.
func (s *ObsidianStore) Save(it Item) (Item, error) {
	if it.ID == "" {
		it.ID = id.New("memory")
	}
	now := time.Now().UTC()
	if it.CreatedAt.IsZero() {
		it.CreatedAt = now
	}
	it.UpdatedAt = now
	if len(it.Tags) == 0 {
		it.Tags = []string{"gideon"}
	}

	dir := filepath.Join(s.base(), folderForType(it.Type))
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return Item{}, err
	}
	path := filepath.Join(dir, s.filename(it))
	it.ObsidianPath = path
	if err := os.WriteFile(path, []byte(Render(it)), 0o644); err != nil {
		return Item{}, err
	}
	return it, nil
}

// List reads every memory item in the vault.
func (s *ObsidianStore) List() ([]Item, error) {
	var items []Item
	err := filepath.WalkDir(s.base(), func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil // skip unreadable entries
		}
		if d.IsDir() || !strings.HasSuffix(d.Name(), ".md") {
			return nil
		}
		raw, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		it, err := Parse(string(raw))
		if err != nil {
			return nil
		}
		it.ObsidianPath = path
		items = append(items, it)
		return nil
	})
	return items, err
}

// Get returns one item by id (scans the vault — fine at MVP scale).
func (s *ObsidianStore) Get(memID string) (Item, error) {
	items, err := s.List()
	if err != nil {
		return Item{}, err
	}
	for _, it := range items {
		if it.ID == memID {
			return it, nil
		}
	}
	return Item{}, os.ErrNotExist
}

// Delete removes the item's file.
func (s *ObsidianStore) Delete(memID string) error {
	it, err := s.Get(memID)
	if err != nil {
		return err
	}
	return os.Remove(it.ObsidianPath)
}

func firstWords(s string, n int) string {
	f := strings.Fields(s)
	if len(f) > n {
		f = f[:n]
	}
	return strings.Join(f, " ")
}
