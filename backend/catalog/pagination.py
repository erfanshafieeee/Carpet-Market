from rest_framework.pagination import PageNumberPagination


class MarketPagination(PageNumberPagination):
    page_size = 9
    page_size_query_param = "page_size"
    max_page_size = 48

    def get_paginated_response(self, data):
        return super().get_paginated_response(data)

