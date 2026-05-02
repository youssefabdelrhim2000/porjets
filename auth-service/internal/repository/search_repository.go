package repository

import (
	"encoding/json"
	"strings"

	"gorm.io/gorm"
)

type EntryPreview struct {
	ID      string `json:"id"`
	Preview string `json:"preview"`
}

type NotebookMatch struct {
	NotebookID    string         `json:"notebook_id"`
	NotebookName  string         `json:"notebook_name"`
	NotebookIcon  string         `json:"notebook_icon"`
	NotebookColor string         `json:"notebook_color"`
	MatchCount    int            `json:"match_count"`
	Entries       []EntryPreview `json:"entries"`
}

type SearchRepository struct {
	db *gorm.DB
}

func NewSearchRepository(db *gorm.DB) *SearchRepository {
	return &SearchRepository{db: db}
}

func (r *SearchRepository) GlobalSearch(q string) ([]NotebookMatch, error) {
	// جيب كل السجلات اللي الـ data بتاعها فيها الكلمة دي
	type RawEntry struct {
		ID           string
		NotebookID   string
		Data         string
		NotebookName string
		NotebookIcon string
		NotebookColor string
	}

	var rawEntries []RawEntry

	err := r.db.Raw(`
		SELECT 
			e.id,
			e.notebook_id,
			e.data,
			n.name  AS notebook_name,
			n.icon  AS notebook_icon,
			n.color AS notebook_color
		FROM notebook_entries e
		JOIN notebooks n ON n.id = e.notebook_id
		WHERE e.data LIKE ?
		LIMIT 200
	`, "%"+q+"%").Scan(&rawEntries).Error

	if err != nil {
		return nil, err
	}

	// جمّع النتائج per notebook
	matchMap := map[string]*NotebookMatch{}
	orderMap := []string{} // عشان نحافظ على الترتيب

	for _, entry := range rawEntries {
		if _, exists := matchMap[entry.NotebookID]; !exists {
			matchMap[entry.NotebookID] = &NotebookMatch{
				NotebookID:    entry.NotebookID,
				NotebookName:  entry.NotebookName,
				NotebookIcon:  entry.NotebookIcon,
				NotebookColor: entry.NotebookColor,
				Entries:       []EntryPreview{},
			}
			orderMap = append(orderMap, entry.NotebookID)
		}

		match := matchMap[entry.NotebookID]
		match.MatchCount++

		// استخرج preview من الـ data
		preview := extractPreview(entry.Data, q)
		if preview != "" && len(match.Entries) < 2 {
			match.Entries = append(match.Entries, EntryPreview{
				ID:      entry.ID,
				Preview: preview,
			})
		}
	}

	// رتّب النتائج
	results := make([]NotebookMatch, 0, len(orderMap))
	for _, id := range orderMap {
		results = append(results, *matchMap[id])
	}

	return results, nil
}

// extractPreview - بيجيب أول قيمة في الـ JSON اللي فيها الكلمة المبحوث عنها
func extractPreview(dataJSON, q string) string {
	var data map[string]interface{}
	if err := json.Unmarshal([]byte(dataJSON), &data); err != nil {
		// لو مش JSON خالص دور فيه string عادي
		if strings.Contains(strings.ToLower(dataJSON), strings.ToLower(q)) {
			if len(dataJSON) > 80 {
				return dataJSON[:80] + "..."
			}
			return dataJSON
		}
		return ""
	}

	return searchInMap(data, q)
}

func searchInMap(data map[string]interface{}, q string) string {
	qLower := strings.ToLower(q)
	for _, v := range data {
		result := searchInValue(v, qLower)
		if result != "" {
			return result
		}
	}
	return ""
}

func searchInValue(v interface{}, qLower string) string {
	switch val := v.(type) {
	case string:
		if strings.Contains(strings.ToLower(val), qLower) {
			if len(val) > 80 {
				return val[:80] + "..."
			}
			return val
		}
	case map[string]interface{}:
		return searchInMap(val, qLower)
	case []interface{}:
		for _, item := range val {
			result := searchInValue(item, qLower)
			if result != "" {
				return result
			}
		}
	}
	return ""
}