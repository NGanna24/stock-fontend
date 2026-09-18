// services/searchService.js
import API_URL from '../config/api';
import axios from 'axios';

class SearchService {
    static async searchGlobal(token, query, limit = 5) {
        try {
            const response = await axios.get(
                API_URL.SEARCH.GLOBAL(query, limit),
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ Search error:', error);
            throw error;
        }
    }
}

export default SearchService;